"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { resendVerificationEmail } from "@/actions/email-verification";
import { Button } from "@/components/ui/button";

const SENT_MESSAGE =
  "If this account needs verification, we sent a new link to your email.";
const GENERIC_ERROR = "Something went wrong. Please try again.";

interface ResendVerificationButtonProps {
  email: string;
}

export function ResendVerificationButton({
  email,
}: ResendVerificationButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await resendVerificationEmail(email);
      if (result.success) {
        toast.success(SENT_MESSAGE);
      } else {
        toast.error(result.error ?? GENERIC_ERROR);
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
