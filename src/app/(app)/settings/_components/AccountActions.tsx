import { Settings } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { DeleteAccountDialog } from "@/features/account/components/DeleteAccountDialog";
import { ChangePasswordForm } from "@/features/auth/components/forms/ChangePasswordForm";
import { getUserProfile } from "@/features/auth/queries";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { SIGN_IN_PATH } from "@/features/auth/domain/auth-paths";

export async function AccountActions() {
  const t = await getTranslations("account");
  const { id: userId } = await getSessionUser();
  const profile = await getUserProfile(userId);
  if (!profile) redirect(SIGN_IN_PATH);

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Settings className="size-4 text-muted-foreground" />
        {t("title")}
      </h2>
      {profile.hasPassword && <ChangePasswordForm />}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-card p-6">
        <div>
          <h3 className="font-medium">{t("deleteTitle")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("deleteDescription")}
          </p>
        </div>
        <DeleteAccountDialog
          hasPassword={profile.hasPassword}
          email={profile.email}
        />
      </div>
    </section>
  );
}
