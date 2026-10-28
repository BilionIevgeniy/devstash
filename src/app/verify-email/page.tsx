import Link from "next/link";
import { z } from "zod";

import { AuthCard } from "@/features/auth/components/AuthCard";
import { ConfirmEmailForm } from "@/features/auth/components/ConfirmEmailForm";
import { ResendVerificationButton } from "@/features/auth/components/ResendVerificationButton";
import { Button } from "@/components/ui/button";
import { INVALID_LINK_ERROR } from "@/features/auth/domain/verification-token";
import { isVerificationTokenValid } from "@/features/auth/services/email-verification";

const searchParamsSchema = z.object({
  token: z.string().min(1),
  email: z.string().trim().toLowerCase().pipe(z.email()),
});

export default async function VerifyEmailPage({
  searchParams,
}: PageProps<"/verify-email">) {
  const parsed = searchParamsSchema.safeParse(await searchParams);

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

  return (
    <AuthCard title="Verification failed" description={INVALID_LINK_ERROR}>
      {parsed.success && <ResendVerificationButton email={parsed.data.email} />}
      <Button asChild variant="outline" size="lg" className="w-full">
        <Link href="/sign-in">Back to sign in</Link>
      </Button>
    </AuthCard>
  );
}
