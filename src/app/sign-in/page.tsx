import Link from "next/link";
import { redirect } from "next/navigation";

import { signInWithGitHub } from "@/features/auth/actions/sign-in";
import { auth } from "@/features/auth/nextauth/auth";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { GitHubSignInButton } from "@/features/auth/components/GitHubSignInButton";
import { SignInForm } from "@/features/auth/components/SignInForm";

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

// A signed-in user goes to the dashboard. Checked here and not in the proxy:
// auth() also checks the session version, so a revoked session is signed out
// here instead of bouncing between the proxy and the pages.
export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <AuthCard title="Sign in" description="Welcome back to DevStash">
      <SignInForm initialError={getErrorMessage(error)} />

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={signInWithGitHub}>
        <GitHubSignInButton />
      </form>

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
