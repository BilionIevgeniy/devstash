import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/features/auth/components/AuthCard";
import { ForgotPasswordForm } from "@/features/auth/components/forms/ForgotPasswordForm";
import { SIGN_IN_PATH } from "@/features/auth/domain/auth-paths";

// Reads the request at its top (the locale, or the link's query), so the page
// blocks on the server and has no instant shell (ADR 0037).
export const instant = false;

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth.forgot");

  return (
    <AuthCard title={t("title")} description={t("description")}>
      <ForgotPasswordForm />

      <p className="text-center text-sm text-muted-foreground">
        {t("remembered")}{" "}
        <Link
          href={SIGN_IN_PATH}
          className="text-foreground underline underline-offset-4 hover:decoration-2"
        >
          {t("signIn")}
        </Link>
      </p>
    </AuthCard>
  );
}
