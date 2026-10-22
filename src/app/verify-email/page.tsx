import Link from "next/link";
import { z } from "zod";

import { AuthCard } from "@/components/auth/AuthCard";
import { ResendVerificationButton } from "@/components/auth/ResendVerificationButton";
import { Button } from "@/components/ui/button";
import { INVALID_LINK_ERROR, verifyEmailToken } from "@/lib/email-verification";

const searchParamsSchema = z.object({
  token: z.string().min(1),
  email: z.string().trim().toLowerCase().pipe(z.email()),
});

export default async function VerifyEmailPage({
  searchParams,
}: PageProps<"/verify-email">) {
  const parsed = searchParamsSchema.safeParse(await searchParams);
  const result = parsed.success
    ? await verifyEmailToken(parsed.data.email, parsed.data.token)
    : { success: false, error: INVALID_LINK_ERROR };

  if (result.success) {
    return (
      <AuthCard
        title="Email verified"
        description="Your account is ready. You can now sign in."
      >
        <Button asChild size="lg" className="w-full">
          <Link href="/sign-in">Go to sign in</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Verification failed"
      description={result.error ?? INVALID_LINK_ERROR}
    >
      {parsed.success && <ResendVerificationButton email={parsed.data.email} />}
      <Button asChild variant="outline" size="lg" className="w-full">
        <Link href="/sign-in">Back to sign in</Link>
      </Button>
    </AuthCard>
  );
}
