import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/features/auth/nextauth/auth";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { GitHubAuthSection } from "@/features/auth/components/GitHubAuthSection";
import { SignInForm } from "@/features/auth/components/SignInForm";
import { safeCallbackPath } from "@/features/auth/domain/callback-url";

const AUTH_ERROR_MESSAGES = new Map([
  ["CredentialsSignin", "Invalid email or password"],
  [
    "OAuthAccountNotLinked",
    "This email is already registered with a different sign-in method",
  ],
]);
const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

function getErrorMessage(
  error: string | string[] | undefined,
): string | undefined {
  if (!error) return undefined;
  const code = Array.isArray(error) ? error[0] : error;
  return AUTH_ERROR_MESSAGES.get(code) ?? DEFAULT_ERROR_MESSAGE;
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

  return (
    <AuthCard title="Sign in" description="Welcome back to DevStash">
      <SignInForm
        callbackUrl={callbackPath}
        initialError={getErrorMessage(error)}
      />

      <GitHubAuthSection
        callbackUrl={callbackPath}
        label="Sign in with GitHub"
      />

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Register
        </Link>
      </p>
    </AuthCard>
  );
}
