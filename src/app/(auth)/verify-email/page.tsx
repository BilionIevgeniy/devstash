import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/features/auth/components/AuthCard";
import { ConfirmEmailForm } from "@/features/auth/components/ConfirmEmailForm";
import { ResendVerificationButton } from "@/features/auth/components/ResendVerificationButton";
import { Button } from "@/components/ui/button";
import { isVerificationTokenValid } from "@/features/auth/queries";
import { emailLinkParamsSchema } from "@/features/auth/schemas";
import { getErrorText } from "@/lib/errors/error-text";
import { SIGN_IN_PATH } from "@/features/auth/domain/auth-paths";

export default async function VerifyEmailPage({
  searchParams,
}: PageProps<"/verify-email">) {
  const parsed = emailLinkParamsSchema.safeParse(await searchParams);
  const t = await getTranslations("auth.verify");

  if (
    parsed.success &&
    (await isVerificationTokenValid(parsed.data.email, parsed.data.token))
  ) {
    return (
      <AuthCard title={t("title")} description={t("description")}>
        <ConfirmEmailForm email={parsed.data.email} token={parsed.data.token} />
      </AuthCard>
    );
  }

  const errorText = await getErrorText();
  return (
    <AuthCard
      title={t("failedTitle")}
      description={errorText("invalidVerificationLink")}
    >
      {parsed.success && <ResendVerificationButton email={parsed.data.email} />}
      <Button asChild variant="outline" size="lg" className="w-full">
        <Link href={SIGN_IN_PATH}>{t("backToSignIn")}</Link>
      </Button>
    </AuthCard>
  );
}
