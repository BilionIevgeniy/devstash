"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { resendVerificationEmail } from "@/features/auth/_internal/actions/email-verification";
import { Button } from "@/components/ui/button";
import { GENERIC_ERROR_MESSAGE } from "@/lib/action-result";

const SENT_MESSAGE =
  "If this account needs verification, we sent a new link to your email.";

interface ResendVerificationButtonProps {
  email: string;
}

export function ResendVerificationButton({
  email,
}: ResendVerificationButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await resendVerificationEmail(email);
        if (result.success) {
          toast.success(SENT_MESSAGE);
        } else {
          toast.error(result.error);
        }
      } catch {
        // A rejection left in the transition would show the error page.
        toast.error(GENERIC_ERROR_MESSAGE);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      disabled={isPending || !email}
      onClick={handleClick}
    >
      {isPending ? "Sending…" : "Resend verification email"}
    </Button>
  );
}
