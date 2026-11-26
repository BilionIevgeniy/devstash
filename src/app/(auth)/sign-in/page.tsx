import { titleOf } from "@/app/page-title";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/features/auth/nextauth/auth";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { GitHubAuthSection } from "@/features/auth/components/GitHubAuthSection";
import { SignInForm } from "@/features/auth/components/forms/SignInForm";
import { PASSWORD_CHANGED_NOTICE } from "@/features/auth/domain/auth-paths";
import { safeCallbackPath } from "@/features/auth/domain/callback-url";
import type { ErrorCode } from "@/i18n/error-codes";

// The `error` of Auth.js in the URL, as one of our codes.
const AUTH_ERROR_CODES = new Map<string, ErrorCode>([
  ["CredentialsSignin", "invalidCredentials"],
  ["OAuthAccountNotLinked", "oauthAccountNotLinked"],
  ["GitHubEmailUnverified", "githubEmailUnverified"],
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
// Reads the request at its top (the session, or the link's query), so the page
// blocks on the server and has no instant shell (ADR 0037).
export const instant = false;

export const generateMetadata = titleOf("auth.signIn");

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const { error, callbackUrl, notice } = await searchParams;
  const callbackPath = safeCallbackPath(callbackUrl);

  const session = await auth();
  if (session?.user) redirect(callbackPath);
  const t = await getTranslations("auth.signIn");

  return (
    <AuthCard title={t("title")} description={t("description")}>
      {notice === PASSWORD_CHANGED_NOTICE && (
        <p
          role="status"
          className="rounded-md border bg-muted/50 px-3 py-2 text-sm"
        >
          {t("passwordChanged")}
        </p>
      )}
      <SignInForm
        callbackUrl={callbackPath}
        initialError={getErrorCode(error)}
      />

      <GitHubAuthSection callbackUrl={callbackPath} label={t("github")} />

      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href="/register"
          className="text-foreground underline underline-offset-4 hover:decoration-2"
        >
          {t("register")}
        </Link>
      </p>
    </AuthCard>
  );
}
