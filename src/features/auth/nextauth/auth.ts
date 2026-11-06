import "server-only";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import {
  EmailNotVerifiedError,
  TooManyAttemptsError,
} from "@/features/auth/_internal/errors";
import { verifyPassword } from "@/features/auth/_internal/password";
import { getCredentialsUser } from "@/features/auth/_internal/queries";
import {
  LOGIN_BY_EMAIL_GLOBAL,
  LOGIN_BY_EMAIL_IP,
  LOGIN_BY_IP,
  loginEmailKey,
} from "@/features/auth/domain/rate-limits";
import { getSessionVersion } from "@/features/auth/queries";
import { credentialsSchema } from "@/features/auth/schemas";
import { getClientIp } from "@/lib/client-ip";
import { prisma } from "@/lib/prisma";
import {
  consumeIpRateLimit,
  consumeRateLimit,
  resetRateLimit,
} from "@/lib/rate-limit";
import authConfig from "./auth.config";
import { getForeignSignInRedirect } from "./foreign-sign-in";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    // Nothing from GitHub is stored: the app never calls its API after sign-in,
    // so a token in Account would only make a database leak worse.
    GitHub({ account: () => undefined }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, request) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Checked here and not in the Server Action so the raw
        // /api/auth/callback/credentials route is throttled too.
        const { email } = parsed.data;
        const ip = getClientIp(request.headers);
        const emailKey = loginEmailKey(email, ip);
        const limits = await Promise.all([
          consumeIpRateLimit(LOGIN_BY_IP, ip),
          consumeRateLimit(LOGIN_BY_EMAIL_IP, emailKey),
          consumeRateLimit(LOGIN_BY_EMAIL_GLOBAL, email),
        ]);
        if (limits.some((limit) => !limit.success)) {
          throw new TooManyAttemptsError();
        }

        const user = await getCredentialsUser(email);
        // A missing account pays the same bcrypt round as a wrong password.
        const isValid = await verifyPassword(
          parsed.data.password,
          user?.password,
        );
        if (!user || !isValid) return null;
        await resetRateLimit(LOGIN_BY_EMAIL_IP, emailKey);
        if (!user.emailVerified) throw new EmailNotVerifiedError();

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    // Runs before Auth.js links the account, so a refusal links nothing.
    async signIn({ user, account }) {
      if (account?.provider !== "github") return true;
      return (await getForeignSignInRedirect(user.id)) ?? true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sv = (await getSessionVersion(user.id)) ?? 0;
        token.authAt = Date.now();
        return token;
      }
      if (!token.sub) return null;

      // A password reset or change bumps the version and an account deletion
      // removes it, which revokes every token issued before. Tokens from before
      // this check existed carry no version and count as 0.
      try {
        const current = await getSessionVersion(token.sub);
        return current === (token.sv ?? 0) ? token : null;
      } catch (error) {
        // A throw here would come back as an empty session, so a database
        // error would sign the user out. The token stays valid until the read
        // works again: the app's own reads fail in the meantime anyway.
        console.error("Reading the session version failed:", error);
        return token;
      }
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
        session.user.authenticatedAt = token.authAt;
      }
      return session;
    },
  },
});
