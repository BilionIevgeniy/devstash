import Link from "next/link";

import { AuthCard } from "@/features/auth/components/AuthCard";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import { Button } from "@/components/ui/button";
import { INVALID_RESET_LINK_MESSAGE } from "@/features/auth/domain/password-reset";
import { isPasswordResetTokenValid } from "@/features/auth/queries";
import { emailLinkParamsSchema } from "@/features/auth/schemas";

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const parsed = emailLinkParamsSchema.safeParse(await searchParams);

  if (
    !parsed.success ||
    !(await isPasswordResetTokenValid(parsed.data.email, parsed.data.token))
  ) {
    return (
      <AuthCard title="Reset link expired" description={INVALID_RESET_LINK_MESSAGE}>
        <Button asChild size="lg" className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Choose a new password for your account"
    >
      <ResetPasswordForm email={parsed.data.email} token={parsed.data.token} />
    </AuthCard>
  );
}
