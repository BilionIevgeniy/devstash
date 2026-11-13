"use client";

import { unstable_rethrow } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { toast } from "sonner";

import {
  changePassword,
  signOutAfterPasswordChange,
} from "@/features/auth/_internal/actions/account";
import {
  emptyFormValues,
  formValues,
} from "@/features/auth/_internal/domain/form-values";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/features/auth/domain/password-reset";
import type { FormActionState } from "@/features/auth/types";
import { useErrorText } from "@/components/common/hooks/use-error-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// The password is changed and every session is revoked, so a retry would only
// be refused: the user is told to start over from the sign-in page.
const FIELDS = [
  {
    name: "currentPassword",
    label: "currentPassword",
    autoComplete: "current-password",
    isNewPassword: false,
  },
  {
    name: "newPassword",
    label: "newPassword",
    autoComplete: "new-password",
    isNewPassword: true,
  },
  {
    name: "confirmPassword",
    label: "confirmNewPassword",
    autoComplete: "new-password",
    isNewPassword: true,
  },
] as const;

const FIELD_NAMES = FIELDS.map(({ name }) => name);
type State = FormActionState<(typeof FIELD_NAMES)[number]>;
const INITIAL_STATE: State = {
  error: null,
  values: emptyFormValues(FIELD_NAMES),
};

// Runs in the browser, since the answer decides what the page does next: a
// toast and a sign-out that redirects. The values come back with the state, so
// the form keeps what the user typed, and are dropped once the password is
// changed.
async function submit(successText: string, formData: FormData): Promise<State> {
  const values = formValues(formData, FIELD_NAMES);
  if (values.newPassword !== values.confirmPassword) {
    return { error: { error: "passwordsDoNotMatch" }, values };
  }

  try {
    const result = await changePassword(values);
    if (!result.success) {
      return { error: result, values };
    }
  } catch (error) {
    unstable_rethrow(error);
    return { error: { error: "generic" }, values };
  }

  // The change revoked every session, this one included; signing out clears
  // the cookie and redirects to /sign-in.
  toast.success(successText);
  try {
    await signOutAfterPasswordChange();
  } catch (error) {
    // The sign-out's redirect arrives here too, and must go on.
    unstable_rethrow(error);
    return {
      error: { error: "passwordUpdatedReload" },
      values: INITIAL_STATE.values,
    };
  }
  return INITIAL_STATE;
}

export function ChangePasswordForm() {
  const t = useTranslations("auth");
  const [state, formAction, isPending] = useActionState(
    (_previous: State, formData: FormData) =>
      submit(t("changePassword.success"), formData),
    INITIAL_STATE,
  );
  // Gone while a new attempt runs, so a repeated error is announced again.
  const error = isPending ? null : state.error;
  const errorText = useErrorText();

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="font-medium">{t("changePassword.title")}</h3>
      <p className="text-sm text-muted-foreground">
        {t("changePassword.description")}
      </p>
      <form action={formAction} className="mt-4 max-w-sm space-y-4">
        {FIELDS.map(({ name, label, autoComplete, isNewPassword }) => (
          <div key={name} className="space-y-2">
            <label htmlFor={name} className="text-sm font-medium">
              {t(`fields.${label}`)}
            </label>
            <Input
              id={name}
              name={name}
              type="password"
              autoComplete={autoComplete}
              defaultValue={state.values[name]}
              required
              minLength={isNewPassword ? MIN_PASSWORD_LENGTH : undefined}
              maxLength={isNewPassword ? MAX_PASSWORD_LENGTH : undefined}
            />
          </div>
        ))}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {errorText(error)}
          </p>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? t("changePassword.pending") : t("changePassword.submit")}
        </Button>
      </form>
    </div>
  );
}
