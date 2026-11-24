import "client-only";

import type { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  switchAccountHref,
  type AccountSwitchReason,
} from "@/features/auth/domain/account-switch";
import { SIGN_IN_PATH } from "@/features/auth/domain/auth-paths";
import type { FormActionState } from "@/features/auth/types";
import type { OperationResult } from "@/lib/errors/action-result";

type Router = ReturnType<typeof useRouter>;

// After an emailed link did its work: the sign-in page with a toast, or, while
// another account is signed in, the switch page, which says the same itself.
export type DoneStep =
  | { switchReason: AccountSwitchReason }
  | { switchReason: null; successText: string };

export function doneStep(
  switchReason: AccountSwitchReason | null,
  successText: string,
): DoneStep {
  return switchReason ? { switchReason } : { switchReason: null, successText };
}

function finishEmailLink(router: Router, done: DoneStep): void {
  // replace: Back must not lead to the link that was just used.
  if (done.switchReason) {
    router.replace(switchAccountHref(done.switchReason));
    return;
  }
  toast.success(done.successText);
  router.replace(SIGN_IN_PATH);
}

// The call of a form on an emailed link and what the page does next. The
// values come back with a failure, so the form keeps what the user typed; a
// success answers the form's empty start, since a password must not stay.
export async function submitEmailLink<Field extends string>(
  router: Router,
  done: DoneStep,
  values: Readonly<Record<Field, string>>,
  initial: FormActionState<Field>,
  action: () => Promise<OperationResult<unknown>>,
): Promise<FormActionState<Field>> {
  try {
    const result = await action();
    if (!result.success) return { error: result, values };
    finishEmailLink(router, done);
    return initial;
  } catch {
    // A rejection left in an action would show the error page.
    return { error: { error: "generic" }, values };
  }
}
