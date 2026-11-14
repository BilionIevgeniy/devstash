import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/features/auth/nextauth/auth";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { GitHubAuthSection } from "@/features/auth/components/GitHubAuthSection";
import { SignInForm } from "@/features/auth/components/SignInForm";
import { safeCallbackPath } from "@/features/auth/domain/callback-url";
import type { ErrorCode } from "@/i18n/error-codes";

// The `error` of Auth.js in the URL, as one of our codes.
const AUTH_ERROR_CODES = new Map<string, ErrorCode>([
  ["CredentialsSignin", "invalidCredentials"],
  ["OAuthAccountNotLinked", "oauthAccountNotLinked"],
]);

function getErrorCode(
  error: string | string[] | undefined,
): ErrorCode | undefined {
  if (!error) return undefined;
  const code = Array.isArray(error) ? error[0] : error;
  return AUTH_ERROR_CODES.get(code) ?? "generic";
}

// A signed-in user goes to the callback path, by default the dashboard. Checked
// here and not in the proxy: auth() also checks the session version, so a
// revoked session reads as signed out here instead of bouncing between the
// proxy and the pages.
export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const { error, callbackUrl } = await searchParams;
  const callbackPath = safeCallbackPath(callbackUrl);

  const session = await auth();
  if (session?.user) redirect(callbackPath);
  const t = await getTranslations("auth.signIn");

  return (
    <AuthCard title={t("title")} description={t("description")}>
      <SignInForm
        callbackUrl={callbackPath}
        initialError={getErrorCode(error)}
      />

      <GitHubAuthSection callbackUrl={callbackPath} label={t("github")} />

      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href="/register"
          className="text-foreground underline-offset-4 hover:underline"
        >
          {t("register")}
        </Link>
      </p>
    </AuthCard>
  );
}
