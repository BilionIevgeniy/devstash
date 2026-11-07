import { signInWithGitHub } from "@/features/auth/actions/sign-in";
import { GitHubSignInButton } from "@/features/auth/components/GitHubSignInButton";

interface GitHubAuthSectionProps {
  /** Where GitHub sends the user back to after signing in. */
  callbackUrl: string;
  label: string;
}

// The "or" divider and the GitHub form under the email form. A first GitHub
// sign-in creates the account, so the register page uses the same action.
export function GitHubAuthSection({
  callbackUrl,
  label,
}: GitHubAuthSectionProps) {
  return (
    <>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={signInWithGitHub}>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <GitHubSignInButton label={label} />
      </form>
    </>
  );
}
