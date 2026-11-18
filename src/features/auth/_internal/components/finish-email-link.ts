import "client-only";

import type { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  switchAccountHref,
  type AccountSwitchReason,
} from "@/features/auth/domain/account-switch";
import { SIGN_IN_PATH } from "@/features/auth/domain/auth-paths";

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

export function finishEmailLink(router: Router, done: DoneStep): void {
  // replace: Back must not lead to the link that was just used.
  if (done.switchReason) {
    router.replace(switchAccountHref(done.switchReason));
    return;
  }
  toast.success(done.successText);
  router.replace(SIGN_IN_PATH);
}
