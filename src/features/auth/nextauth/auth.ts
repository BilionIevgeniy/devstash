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
import { SIGN_IN_PATH } from "@/features/auth/domain/auth-paths";
import { getSessionVersion } from "@/features/auth/queries";
import { credentialsSchema } from "@/features/auth/schemas";
import { getClientIp } from "@/lib/http/client-ip";
import { logger } from "@/lib/observability/logger";
import { prisma } from "@/lib/postgres/prisma";
import {
  consumeIpRateLimit,
  consumeRateLimit,
  resetRateLimit,
} from "@/lib/vendors/rate-limit";
import authConfig from "./auth.config";
import { authLogger } from "./auth-logger";
import { getForeignSignInRedirect } from "./foreign-sign-in";
import { requestGitHubProfile } from "./github-userinfo";

// A new GitHub user without a verified address is refused: the account's
// email is where its deletion link and every notice go.
const GITHUB_EMAIL_UNVERIFIED_URL = `${SIGN_IN_PATH}?error=GitHubEmailUnverified`;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  logger: authLogger,
  session: { strategy: "jwt" },
  providers: [
    // Nothing from GitHub is stored: the app never calls its API after sign-in,
    // so a token in Account would only make a database leak worse. The address
    // must be one GitHub has verified (github-userinfo.ts).
    GitHub({
      account: () => undefined,
      userinfo: { request: requestGitHubProfile },
    }),
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
    // Runs before Auth.js links the account, so a refusal links nothing. A
    // linked account brings the stored user, which always has its address.
    async signIn({ user, account }) {
      if (account?.provider !== "github") return true;
      const foreign = await getForeignSignInRedirect(user.id);
      if (foreign) return foreign;
      return user.email ? true : GITHUB_EMAIL_UNVERIFIED_URL;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sv = (await getSessionVersion(user.id)) ?? 0;
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
        await logger.error("Reading the session version failed", {
          error,
          userId: token.sub,
        });
        return token;
      }
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
