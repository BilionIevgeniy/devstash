import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/features/auth/components/AuthCard";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import { Button } from "@/components/ui/button";
import { isPasswordResetTokenValid } from "@/features/auth/queries";
import { emailLinkParamsSchema } from "@/features/auth/schemas";
import { getErrorText } from "@/lib/error-text";

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
          <Link href="/sign-in">{t("backToSignIn")}</Link>
        </Button>
      </AuthCard>
    );
  }

  const t = await getTranslations("auth.reset");
  return (
    <AuthCard title={t("title")} description={t("description")}>
      <ResetPasswordForm email={parsed.data.email} token={parsed.data.token} />
    </AuthCard>
  );
}
