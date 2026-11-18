import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";

import { deleteAccount } from "@/features/account/_internal/actions/delete-account";
import type { ErrorRef } from "@/i18n/error-codes";

export interface DeleteAccountInput {
  password?: string;
  token?: string;
}

// The delete of the dialog's password body and of the deletion link's page. A
// success ends in a redirect, which must go on; a refusal stays on screen.
export function useDeleteAccount() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<ErrorRef | null>(null);

  function submit(input: DeleteAccountInput) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteAccount(input);
        if (!result.success) setError(result);
      } catch (error) {
        unstable_rethrow(error);
        setError({ error: "generic" });
      }
    });
  }

  return { isPending, error, submit };
}
