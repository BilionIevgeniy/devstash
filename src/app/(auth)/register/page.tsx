import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/features/auth/components/AuthCard";
import { GitHubAuthSection } from "@/features/auth/components/GitHubAuthSection";
import { RegisterForm } from "@/features/auth/components/forms/RegisterForm";
import { auth } from "@/features/auth/nextauth/auth";
import {
  DASHBOARD_PATH,
  SIGN_IN_PATH,
} from "@/features/auth/domain/auth-paths";

// A signed-in user goes to the dashboard. Checked here and not in the proxy:
// auth() also checks the session version, so a revoked session reads as signed
// out here instead of bouncing between the proxy and the pages.
export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect(DASHBOARD_PATH);
  const t = await getTranslations("auth.register");

  return (
    <AuthCard title={t("title")} description={t("description")}>
      <RegisterForm />

      <GitHubAuthSection callbackUrl={DASHBOARD_PATH} label={t("github")} />

      <p className="text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
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
