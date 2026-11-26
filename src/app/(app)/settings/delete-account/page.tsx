import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { DeletionNotice } from "@/app/(app)/settings/delete-account/_components/DeletionNotice";
import { ConfirmAccountDeletion } from "@/features/account/components/ConfirmAccountDeletion";
import { SwitchAccountButton } from "@/features/auth/components/SwitchAccountButton";
import { accountDeletionPath } from "@/features/auth/domain/account-deletion";
import { SETTINGS_PATH, SIGN_IN_PATH } from "@/features/auth/domain/auth-paths";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { getDeletionLinkState } from "@/features/auth/queries";
import { emailLinkParamsSchema } from "@/features/auth/schemas";
import { Button } from "@/components/ui/button";
import { getErrorText } from "@/lib/errors/error-text";

// The page of the emailed deletion link of an account with no password. It
// renders only: the delete is the button's action, so a mail scanner that
// fetches the link deletes nothing. A link for another account is offered a
// sign-out first, and leads back here after the sign-in.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("confirmTitle") };
}

export default async function DeleteAccountPage({
  searchParams,
}: PageProps<"/settings/delete-account">) {
  const { id: userId } = await getSessionUser();
  const [link, t] = await Promise.all([
    searchParams.then((params) => emailLinkParamsSchema.safeParse(params)),
    getTranslations("account"),
  ]);
  const state = link.success
    ? await getDeletionLinkState(userId, link.data.email, link.data.token)
    : "invalid";
  if (!state) redirect(SIGN_IN_PATH);

  if (link.success && state === "otherAccount") {
    return (
      <DeletionNotice
        title={t("otherAccountTitle")}
        description={t("otherAccountDescription")}
      >
        <SwitchAccountButton
          callbackUrl={accountDeletionPath(link.data.email, link.data.token)}
        />
      </DeletionNotice>
    );
  }

  if (link.success && state === "valid") {
    return (
      <DeletionNotice
        title={t("confirmTitle")}
        description={t("dialogDescription")}
      >
        <ConfirmAccountDeletion token={link.data.token} />
      </DeletionNotice>
    );
  }

  const errorText = await getErrorText();
  return (
    <DeletionNotice
      title={t("expiredTitle")}
      description={errorText("invalidDeletionLink")}
    >
      <Button asChild variant="outline">
        <Link href={SETTINGS_PATH}>{t("backToSettings")}</Link>
      </Button>
    </DeletionNotice>
  );
}
