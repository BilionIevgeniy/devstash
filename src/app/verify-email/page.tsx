import Link from "next/link";

import { AuthCard } from "@/features/auth/components/AuthCard";
import { ConfirmEmailForm } from "@/features/auth/components/ConfirmEmailForm";
import { ResendVerificationButton } from "@/features/auth/components/ResendVerificationButton";
import { Button } from "@/components/ui/button";
import { isVerificationTokenValid } from "@/features/auth/queries";
import { emailLinkParamsSchema } from "@/features/auth/schemas";
import { getErrorText } from "@/lib/error-text";

export default async function VerifyEmailPage({
  searchParams,
}: PageProps<"/verify-email">) {
  const parsed = emailLinkParamsSchema.safeParse(await searchParams);

  if (
    parsed.success &&
    (await isVerificationTokenValid(parsed.data.email, parsed.data.token))
  ) {
    return (
      <AuthCard
        title="Confirm your email"
        description="Enter your account password to finish verification"
      >
        <ConfirmEmailForm
          email={parsed.data.email}
          token={parsed.data.token}
        />
      </AuthCard>
    );
  }

  const errorText = await getErrorText();
  return (
    <AuthCard
      title="Verification failed"
      description={errorText("invalidVerificationLink")}
    >
      {parsed.success && <ResendVerificationButton email={parsed.data.email} />}
      <Button asChild variant="outline" size="lg" className="w-full">
        <Link href="/sign-in">Back to sign in</Link>
      </Button>
    </AuthCard>
  );
}
