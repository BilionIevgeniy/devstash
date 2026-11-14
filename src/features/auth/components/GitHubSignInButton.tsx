"use client";

import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

// Must sit inside the form whose Server Action it reports on. The pending
// state lasts until the browser has followed the redirect to GitHub.
export function GitHubSignInButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const t = useTranslations("auth.signIn");

  return (
    <Button
      type="submit"
      variant="outline"
      size="lg"
      className="w-full"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2Icon className="size-4 animate-spin" />
          {t("pending")}
        </>
      ) : (
        label
      )}
    </Button>
  );
}
