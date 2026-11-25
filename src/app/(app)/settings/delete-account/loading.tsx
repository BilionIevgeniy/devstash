import { useTranslations } from "next-intl";

import { DeletionNoticeSkeleton } from "@/app/(app)/settings/delete-account/_components/DeletionNoticeSkeleton";

// The state a working link opens: its title, its text and its button.
export default function DeleteAccountLoading() {
  const t = useTranslations("account");
  return (
    <DeletionNoticeSkeleton
      title={t("confirmTitle")}
      description={t("dialogDescription")}
      button={t("confirmButton")}
    />
  );
}
