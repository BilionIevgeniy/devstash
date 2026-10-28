import type { ActionResult } from "@/lib/action-result";

export type AuthActionState = ActionResult;

export interface AccountState {
  hasPassword: boolean;
  isEmailVerified: boolean;
}

export interface UserProfile {
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date;
  /** False for accounts that only sign in with an OAuth provider. */
  hasPassword: boolean;
}
