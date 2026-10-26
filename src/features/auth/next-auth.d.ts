import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /** Epoch ms of the sign-in that created the session; absent on older tokens. */
      authenticatedAt?: number;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    /** User.sessionVersion when the token was issued; absent on older tokens. */
    sv?: number;
    /** Epoch ms of the sign-in that issued the token. */
    authAt?: number;
  }
}
