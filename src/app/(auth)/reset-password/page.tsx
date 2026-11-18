import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { auth } from "@/features/auth/nextauth/auth";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { isOtherAccount } from "@/features/auth/domain/account-switch";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import { Button } from "@/components/ui/button";
import { isPasswordResetTokenValid } from "@/features/auth/queries";
import { emailLinkParamsSchema } from "@/features/auth/schemas";
import { getErrorText } from "@/lib/errors/error-text";
import { SIGN_IN_PATH } from "@/features/auth/domain/auth-paths";

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const parsed = emailLinkParamsSchema.safeParse(await searchParams);

  if (
    !parsed.success ||
    !(await isPasswordResetTokenValid(parsed.data.email, parsed.data.token))
  ) {
    const errorText = await getErrorText();
    const t = await getTranslations("auth.reset");
    return (
      <AuthCard
        title={t("expiredTitle")}
        description={errorText("invalidResetLink")}
      >
        <Button asChild size="lg" className="w-full">
          <Link href="/forgot-password">{t("requestNew")}</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href={SIGN_IN_PATH}>{t("backToSignIn")}</Link>
        </Button>
      </AuthCard>
    );
  }

  const [t, session] = await Promise.all([
    getTranslations("auth.reset"),
    auth(),
  ]);
  return (
    <AuthCard title={t("title")} description={t("description")}>
      <ResetPasswordForm
        email={parsed.data.email}
        token={parsed.data.token}
        switchReason={
          isOtherAccount(session?.user, parsed.data.email) ? "password" : null
        }
      />
    </AuthCard>
  );
}
