"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { toast } from "sonner";

import { resetPassword } from "@/features/auth/_internal/actions/password-reset";
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

const SIGN_IN_URL = "/sign-in";

const FIELDS = [
  { name: "password", label: "newPassword" },
  { name: "confirmPassword", label: "confirmNewPassword" },
] as const;

const FIELD_NAMES = FIELDS.map(({ name }) => name);
type State = FormActionState<(typeof FIELD_NAMES)[number]>;
const INITIAL_STATE: State = {
  error: null,
  values: emptyFormValues(FIELD_NAMES),
};

type Router = ReturnType<typeof useRouter>;

// Runs in the browser, since the answer decides what the page does next: a
// toast and a move to the sign-in page. The values come back with the state, so
// the form keeps what the user typed, and are dropped once the reset worked.
async function submit(
  router: Router,
  email: string,
  token: string,
  successText: string,
  formData: FormData,
): Promise<State> {
  const values = formValues(formData, FIELD_NAMES);
  if (values.password !== values.confirmPassword) {
    return { error: { error: "passwordsDoNotMatch" }, values };
  }

  try {
    const result = await resetPassword({ ...values, email, token });
    if (!result.success) {
      return { error: result, values };
    }
    toast.success(successText);
    // replace: Back must not lead to the link that was just used.
    router.replace(SIGN_IN_URL);
    return INITIAL_STATE;
  } catch {
    // A rejection left in an action would show the error page.
    return { error: { error: "generic" }, values };
  }
}

interface ResetPasswordFormProps {
  email: string;
  token: string;
}

export function ResetPasswordForm({ email, token }: ResetPasswordFormProps) {
  const router = useRouter();
  const t = useTranslations("auth");
  const [state, formAction, isPending] = useActionState(
    (_previous: State, formData: FormData) =>
      submit(router, email, token, t("reset.success"), formData),
    INITIAL_STATE,
  );
  // Gone while a new attempt runs, so a repeated error is announced again.
  const error = isPending ? null : state.error;
  const errorText = useErrorText();

  return (
    <form action={formAction} className="space-y-4">
      {FIELDS.map(({ name, label }) => (
        <div key={name} className="space-y-2">
          <label htmlFor={name} className="text-sm font-medium">
            {t(`fields.${label}`)}
          </label>
          <Input
            id={name}
            name={name}
            type="password"
            autoComplete="new-password"
            defaultValue={state.values[name]}
            required
            minLength={MIN_PASSWORD_LENGTH}
            maxLength={MAX_PASSWORD_LENGTH}
          />
        </div>
      ))}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {errorText(error)}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? t("reset.pending") : t("reset.submit")}
      </Button>
      {error?.error === "invalidResetLink" && (
        <Link
          href="/forgot-password"
          className="block text-center text-sm text-foreground underline-offset-4 hover:underline"
        >
          {t("reset.requestNewLink")}
        </Link>
      )}
    </form>
  );
}
