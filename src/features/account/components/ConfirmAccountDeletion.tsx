"use client";
import { useTranslations } from "next-intl";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";

import { deleteAccount } from "@/features/account/_internal/actions/delete-account";
import { DeleteError } from "@/features/account/_internal/components/DeleteError";
import { Button } from "@/components/ui/button";
import type { ErrorRef } from "@/i18n/error-codes";

// The delete on the page the emailed link opens. Opening the link deletes
// nothing (a mail scanner may fetch it): only this click does.
export function ConfirmAccountDeletion({ token }: { token: string }) {
  const tActions = useTranslations("common.actions");
  const t = useTranslations("account");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<ErrorRef | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteAccount({ token });
        if (!result.success) setError(result);
      } catch (error) {
        // A success ends in a redirect, which must go on.
        unstable_rethrow(error);
        setError({ error: "generic" });
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && <DeleteError error={error} />}
      <Button variant="destructive" disabled={isPending} onClick={handleDelete}>
        {isPending ? tActions("deleting") : t("confirmButton")}
      </Button>
    </div>
  );
}
