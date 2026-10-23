import Link from "next/link";

import { signInWithGitHub } from "@/features/auth/actions/auth";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { SignInForm } from "@/features/auth/components/SignInForm";
import { Button } from "@/components/ui/button";

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

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
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
        <Button type="submit" variant="outline" size="lg" className="w-full">
          Sign in with GitHub
        </Button>
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
