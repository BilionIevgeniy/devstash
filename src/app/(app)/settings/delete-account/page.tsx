import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { DeletionNotice } from "@/app/(app)/settings/delete-account/_components/DeletionNotice";
import { ConfirmAccountDeletion } from "@/features/account/components/ConfirmAccountDeletion";
import { SwitchAccountButton } from "@/features/auth/components/SwitchAccountButton";
import { accountDeletionPath } from "@/features/auth/domain/account-deletion";
import { SIGN_IN_PATH } from "@/features/auth/domain/auth-paths";
import { getSessionUser } from "@/features/auth/nextauth/session";
import {
  getUserProfile,
  isAccountDeletionTokenValid,
} from "@/features/auth/queries";
import { emailLinkParamsSchema } from "@/features/auth/schemas";
import { Button } from "@/components/ui/button";
import { getErrorText } from "@/lib/errors/error-text";

const SETTINGS_PATH = "/settings";

// The page of the emailed deletion link of an account with no password. It
// renders only: the delete is the button's action, so a mail scanner that
// fetches the link deletes nothing. The link's address must be the signed-in
// account's own; another account is offered to sign out first.
export default async function DeleteAccountPage({
  searchParams,
}: PageProps<"/settings/delete-account">) {
  const { id: userId } = await getSessionUser();
  const [profile, params, t] = await Promise.all([
    getUserProfile(userId),
    searchParams,
    getTranslations("account"),
  ]);
  if (!profile) redirect(SIGN_IN_PATH);
  const link = emailLinkParamsSchema.safeParse(params);

  if (link.success && link.data.email !== profile.email) {
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

  const isValid =
    link.success &&
    !profile.hasPassword &&
    (await isAccountDeletionTokenValid(link.data.email, link.data.token));
  if (!link.success || !isValid) {
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

  return (
    <DeletionNotice
      title={t("confirmTitle")}
      description={t("dialogDescription")}
    >
      <ConfirmAccountDeletion token={link.data.token} />
    </DeletionNotice>
  );
}
