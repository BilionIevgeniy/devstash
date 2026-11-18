"use client";
import { useTranslations } from "next-intl";

import { useDeleteAccount } from "@/features/account/_internal/components/hooks/use-delete-account";
import { DeleteError } from "@/features/account/_internal/components/DeleteError";
import { Button } from "@/components/ui/button";

// The delete on the page the emailed link opens. Opening the link deletes
// nothing (a mail scanner may fetch it): only this click does.
export function ConfirmAccountDeletion({ token }: { token: string }) {
  const tActions = useTranslations("common.actions");
  const t = useTranslations("account");
  const { isPending, error, submit } = useDeleteAccount();

  return (
    <div className="space-y-4">
      {error && <DeleteError error={error} />}
      <Button
        variant="destructive"
        disabled={isPending}
        onClick={() => submit({ token })}
      >
        {isPending ? tActions("deleting") : t("confirmButton")}
      </Button>
    </div>
  );
}
