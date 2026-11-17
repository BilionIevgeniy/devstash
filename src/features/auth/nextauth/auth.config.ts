import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import type { NextAuthConfig } from "next-auth";
import { SIGN_IN_PATH } from "@/features/auth/domain/auth-paths";

export default {
  providers: [GitHub, Credentials({ authorize: () => null })],
  pages: { signIn: SIGN_IN_PATH },
} satisfies NextAuthConfig;
