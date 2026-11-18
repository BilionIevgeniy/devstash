"use client";

import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";

import { switchAccount } from "@/features/auth/actions/sign-in";
import { Button } from "@/components/ui/button";

interface SwitchAccountButtonProps {
  /** Where the sign-in leads afterwards; the dashboard when left out. */
  callbackUrl?: string;
}

// Signs out and opens the sign-in page, which then continues to callbackUrl.
export function SwitchAccountButton({ callbackUrl }: SwitchAccountButtonProps) {
  return (
    <form action={switchAccount} className="w-full">
      {callbackUrl && (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      )}
      <SubmitButton />
    </form>
  );
}

// Inside the form, so useFormStatus sees its action; pending lasts until the
// browser has followed the redirect.
function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("auth.switch");

  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2Icon className="size-4 animate-spin" />
          {t("pending")}
        </>
      ) : (
        t("submit")
      )}
    </Button>
  );
}
