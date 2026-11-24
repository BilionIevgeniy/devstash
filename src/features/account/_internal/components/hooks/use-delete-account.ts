import { useState, useTransition } from "react";
import { useLocale } from "next-intl";

import { deleteAccount } from "@/features/account/_internal/actions/delete-account";
import { leaveSession } from "@/features/auth/components/leave-session";
import { homePath } from "@/i18n/config";
import type { ErrorRef } from "@/i18n/error-codes";
import { isNavigationError } from "@/lib/errors/navigation-error";

export interface DeleteAccountInput {
  password?: string;
  token?: string;
}

// The delete of the dialog's password body and of the deletion link's page. A
// success loads the homepage as a new document (leaveSession, ADR 0037) and
// stays pending until it does, so nothing can be sent on a deleted account; a
// refusal stays on screen. The action's cookie deletion re-renders the page,
// which can redirect to sign-in on its own: that redirect is left the same
// way, never followed as a soft navigation, so no rethrow here.
export function useDeleteAccount() {
  const [isPending, startTransition] = useTransition();
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<ErrorRef | null>(null);
  const home = homePath(useLocale());

  function leave() {
    setIsLeaving(true);
    leaveSession(home);
  }

  function submit(input: DeleteAccountInput) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteAccount(input);
        // signedOut: an earlier attempt already deleted the account and
        // ended the session, and only its answer was lost.
        if (result.success || result.error === "signedOut") leave();
        else setError(result);
      } catch (error) {
        if (isNavigationError(error)) leave();
        else setError({ error: "generic" });
      }
    });
  }

  return { isPending: isPending || isLeaving, error, submit };
}
