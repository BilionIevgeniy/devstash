"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { toast } from "sonner";

import { confirmEmail } from "@/features/auth/_internal/actions/email-verification";
import { ResendVerificationButton } from "@/features/auth/components/ResendVerificationButton";
import {
  emptyFormValues,
  formValues,
} from "@/features/auth/_internal/domain/form-values";
import type { FormActionState } from "@/features/auth/types";
import { useErrorText } from "@/components/common/hooks/use-error-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SIGN_IN_PATH } from "@/features/auth/domain/auth-paths";
import {
  switchAccountHref,
  type AccountSwitchReason,
} from "@/features/auth/domain/account-switch";

const FIELD_NAMES = ["password"] as const;
type State = FormActionState<(typeof FIELD_NAMES)[number]>;
const INITIAL_STATE: State = {
  error: null,
  values: emptyFormValues(FIELD_NAMES),
};

type Router = ReturnType<typeof useRouter>;

// After success: the sign-in page with a toast, or, while another account is
// signed in, the switch page, which says the same itself.
type DoneStep =
  | { switchReason: AccountSwitchReason }
  | { switchReason: null; successText: string };

function finish(router: Router, done: DoneStep) {
  // replace: Back must not lead to the link that was just used.
  if (done.switchReason) {
    router.replace(switchAccountHref(done.switchReason));
    return;
  }
  toast.success(done.successText);
  router.replace(SIGN_IN_PATH);
}

// Runs in the browser, since the answer decides what the page does next: a
// toast and a move to the sign-in page. The values come back with the state, so
// the form keeps what the user typed, and are dropped once the email is
// confirmed.
async function submit(
  router: Router,
  email: string,
  token: string,
  done: DoneStep,
  formData: FormData,
): Promise<State> {
  const values = formValues(formData, FIELD_NAMES);

  try {
    const result = await confirmEmail({ ...values, email, token });
    if (!result.success) {
      return { error: result, values };
    }
    finish(router, done);
    return INITIAL_STATE;
  } catch {
    // A rejection left in an action would show the error page.
    return { error: { error: "generic" }, values };
  }
}

interface ConfirmEmailFormProps {
  email: string;
  token: string;
  /** Set while another account is signed in: success leads to the switch page. */
  switchReason?: AccountSwitchReason | null;
}

export function ConfirmEmailForm({
  email,
  token,
  switchReason = null,
}: ConfirmEmailFormProps) {
  const router = useRouter();
  const t = useTranslations("auth");
  const [state, formAction, isPending] = useActionState(
    (_previous: State, formData: FormData) =>
      submit(
        router,
        email,
        token,
        switchReason
          ? { switchReason }
          : { switchReason: null, successText: t("verify.success") },
        formData,
      ),
    INITIAL_STATE,
  );
  // Gone while a new attempt runs, so a repeated error is announced again.
  const error = isPending ? null : state.error;
  const errorText = useErrorText();

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          {t("fields.password")}
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          defaultValue={state.values.password}
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {errorText(error)}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? t("verify.pending") : t("verify.submit")}
      </Button>
      {error?.error === "wrongConfirmPassword" && (
        <Link
          href="/forgot-password"
          className="block text-center text-sm text-foreground underline-offset-4 hover:underline"
        >
          {t("verify.forgot")}
        </Link>
      )}
      {error?.error === "invalidVerificationLink" && (
        <ResendVerificationButton email={email} />
      )}
    </form>
  );
}
