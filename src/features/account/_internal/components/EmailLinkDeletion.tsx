"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { useState, useTransition, type MouseEvent } from "react";

import { requestAccountDeletionLink } from "@/features/account/_internal/actions/delete-account";
import { DeleteError } from "@/features/account/_internal/components/DeleteError";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import type { ErrorRef } from "@/i18n/error-codes";
import { isNavigationError } from "@/lib/errors/navigation-error";
import { IMPRINT_PATH } from "@/lib/http/legal-paths";

// The body of the delete dialog for an account with no password: it sends the
// link that confirms the delete. Once sent, the send button gives way to Close,
// which takes the focus, and the status is announced.
export function EmailLinkDeletion({ email }: { email: string }) {
  const tActions = useTranslations("common.actions");
  const t = useTranslations("account");
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<ErrorRef | null>(null);

  function handleSend(event: MouseEvent<HTMLButtonElement>) {
    // Keep the dialog open: it says where the link went.
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await requestAccountDeletionLink();
        if (result.success) setSent(true);
        else setError(result);
      } catch (error) {
        if (isNavigationError(error)) return;
        setError({ error: "generic" });
      }
    });
  }

  if (sent) {
    return (
      <>
        <p role="status" className="text-sm">
          {t("linkSent", { email })}
        </p>
        <AlertDialogFooter>
          <AlertDialogCancel autoFocus>{t("close")}</AlertDialogCancel>
        </AlertDialogFooter>
      </>
    );
  }

  return (
    <>
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>{t("emailLinkNote", { email })}</p>
        <p>
          {t.rich("noInbox", {
            link: (chunks) => (
              <Link
                href={IMPRINT_PATH}
                className="underline underline-offset-4"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
      {error && <DeleteError error={error} />}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>
          {tActions("cancel")}
        </AlertDialogCancel>
        <AlertDialogAction disabled={isPending} onClick={handleSend}>
          {isPending ? t("sendingLink") : t("sendLink")}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
