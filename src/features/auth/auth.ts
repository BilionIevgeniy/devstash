import "server-only";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  EmailNotVerifiedError,
  TooManyAttemptsError,
} from "@/features/auth/_internal/errors";
import { LOGIN_BY_EMAIL, LOGIN_BY_IP } from "@/features/auth/domain/rate-limits";
import { prisma } from "@/lib/prisma";
import {
  consumeIpRateLimit,
  consumeRateLimit,
  resetRateLimit,
} from "@/lib/rate-limit";
import authConfig from "./auth.config";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(72),
});

async function getSessionVersion(userId: string): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true },
  });
  return user?.sessionVersion ?? null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    GitHub,
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
        const [ipAllowed, emailAllowed] = await Promise.all([
          consumeIpRateLimit(LOGIN_BY_IP, request.headers),
          consumeRateLimit(LOGIN_BY_EMAIL, parsed.data.email),
        ]);
        if (!ipAllowed || !emailAllowed) throw new TooManyAttemptsError();

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user?.password) return null;

        const isValid = await bcrypt.compare(parsed.data.password, user.password);
        if (!isValid) return null;
        await resetRateLimit(LOGIN_BY_EMAIL, parsed.data.email);
        if (!user.emailVerified) throw new EmailNotVerifiedError();

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
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
      const current = await getSessionVersion(token.sub);
      return current === (token.sv ?? 0) ? token : null;
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
