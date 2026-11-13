import type { ErrorRef } from "@/i18n/error-codes";
import type { ActionResult } from "@/lib/action-result";

export type AuthActionState = ActionResult;

/**
 * The state of a form whose action runs in the browser: the error to show and
 * the values to put back, since React clears a form after its action.
 */
export interface FormActionState<Field extends string> {
  error: ErrorRef | null;
  values: Readonly<Record<Field, string>>;
}

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
