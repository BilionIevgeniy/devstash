"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { requestPasswordReset } from "@/features/auth/_internal/actions/password-reset";
import { useErrorText } from "@/components/common/hooks/use-error-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
    null,
  );
  const errorText = useErrorText();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");

  if (state?.success) {
    return (
      <div className="space-y-2 text-center">
        <h2 className="text-lg font-semibold">{t("forgot.sentTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t.rich("forgot.sentBody", {
            email,
            strong: (chunks) => (
              <span className="font-medium text-foreground">{chunks}</span>
            ),
          })}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          {t("fields.email")}
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      {state && !state.success && (
        <p role="alert" className="text-sm text-destructive">
          {errorText(state)}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? t("forgot.pending") : t("forgot.submit")}
      </Button>
    </form>
  );
}
