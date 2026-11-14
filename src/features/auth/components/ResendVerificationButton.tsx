"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { resendVerificationEmail } from "@/features/auth/_internal/actions/email-verification";
import { useErrorText } from "@/components/common/hooks/use-error-text";
import { Button } from "@/components/ui/button";

interface ResendVerificationButtonProps {
  email: string;
}

export function ResendVerificationButton({
  email,
}: ResendVerificationButtonProps) {
  const [isPending, startTransition] = useTransition();
  const errorText = useErrorText();
  const t = useTranslations("auth.resend");

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await resendVerificationEmail(email);
        if (result.success) {
          toast.success(t("sent"));
        } else {
          toast.error(errorText(result));
        }
      } catch {
        // A rejection left in the transition would show the error page.
        toast.error(errorText("generic"));
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
      {isPending ? t("pending") : t("button")}
    </Button>
  );
}
