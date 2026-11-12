"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { toast } from "sonner";

import { confirmEmail } from "@/features/auth/_internal/actions/email-verification";
import { ResendVerificationButton } from "@/features/auth/components/ResendVerificationButton";
import {
  emptyFormValues,
  formValues,
} from "@/features/auth/_internal/domain/form-values";
import { GENERIC_ERROR_MESSAGE } from "@/features/auth/_internal/messages";
import {
  INVALID_LINK_ERROR,
  WRONG_CONFIRM_PASSWORD_MESSAGE,
} from "@/features/auth/domain/verification-token";
import type { FormActionState } from "@/features/auth/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SUCCESS_MESSAGE = "Email verified. You can now sign in.";
const SIGN_IN_URL = "/sign-in";

const FIELD_NAMES = ["password"] as const;
type State = FormActionState<(typeof FIELD_NAMES)[number]>;
const INITIAL_STATE: State = {
  error: null,
  values: emptyFormValues(FIELD_NAMES),
};

type Router = ReturnType<typeof useRouter>;

// Runs in the browser, since the answer decides what the page does next: a
// toast and a move to the sign-in page. The values come back with the state, so
// the form keeps what the user typed, and are dropped once the email is
// confirmed.
async function submit(
  router: Router,
  email: string,
  token: string,
  formData: FormData,
): Promise<State> {
  const values = formValues(formData, FIELD_NAMES);

  try {
    const result = await confirmEmail({ ...values, email, token });
    if (!result.success) {
      return { error: result.error ?? GENERIC_ERROR_MESSAGE, values };
    }
    toast.success(SUCCESS_MESSAGE);
    // replace: Back must not lead to the link that was just used.
    router.replace(SIGN_IN_URL);
    return INITIAL_STATE;
  } catch {
    // A rejection left in an action would show the error page.
    return { error: GENERIC_ERROR_MESSAGE, values };
  }
}

interface ConfirmEmailFormProps {
  email: string;
  token: string;
}

export function ConfirmEmailForm({ email, token }: ConfirmEmailFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    (_previous: State, formData: FormData) =>
      submit(router, email, token, formData),
    INITIAL_STATE,
  );
  // Gone while a new attempt runs, so a repeated error is announced again.
  const error = isPending ? null : state.error;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
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
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Verifying…" : "Verify email"}
      </Button>
      {error === WRONG_CONFIRM_PASSWORD_MESSAGE && (
        <Link
          href="/forgot-password"
          className="block text-center text-sm text-foreground underline-offset-4 hover:underline"
        >
          Forgot password?
        </Link>
      )}
      {error === INVALID_LINK_ERROR && (
        <ResendVerificationButton email={email} />
      )}
    </form>
  );
}
