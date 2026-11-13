"use client";

import { useActionState } from "react";

import { CheckEmailNotice } from "@/features/auth/_internal/components/CheckEmailNotice";
import { postRegistration } from "@/features/auth/_internal/components/fetch-register";
import { useErrorText } from "@/components/common/hooks/use-error-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  emptyFormValues,
  formValues,
} from "@/features/auth/_internal/domain/form-values";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/features/auth/domain/password-reset";
import type { FormActionState } from "@/features/auth/types";

const FIELDS = [
  { name: "name", label: "Name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  {
    name: "password",
    label: "Password",
    type: "password",
    autoComplete: "new-password",
  },
  {
    name: "confirmPassword",
    label: "Confirm password",
    type: "password",
    autoComplete: "new-password",
  },
] as const;

const FIELD_NAMES = FIELDS.map(({ name }) => name);

interface State extends FormActionState<(typeof FIELD_NAMES)[number]> {
  /** Set once the account was accepted: the form gives way to the notice. */
  registeredEmail: string | null;
}

const INITIAL_STATE: State = {
  error: null,
  values: emptyFormValues(FIELD_NAMES),
  registeredEmail: null,
};

// The values come back with the state, so the form keeps what the user typed,
// and are dropped once the account is accepted.
async function submit(_previous: State, formData: FormData): Promise<State> {
  const values = formValues(formData, FIELD_NAMES);
  if (values.password !== values.confirmPassword) {
    return {
      error: { error: "passwordsDoNotMatch" },
      values,
      registeredEmail: null,
    };
  }

  const result = await postRegistration(values);
  return result.success
    ? { ...INITIAL_STATE, registeredEmail: values.email }
    : { error: result, values, registeredEmail: null };
}

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(submit, INITIAL_STATE);
  // Gone while a new attempt runs, so a repeated error is announced again.
  const error = isPending ? null : state.error;
  const errorText = useErrorText();

  if (state.registeredEmail) {
    return <CheckEmailNotice email={state.registeredEmail} />;
  }

  return (
    <form action={formAction} className="space-y-4">
      {FIELDS.map(({ name, label, type, autoComplete }) => (
        <div key={name} className="space-y-2">
          <label htmlFor={name} className="text-sm font-medium">
            {label}
          </label>
          <Input
            id={name}
            name={name}
            type={type}
            autoComplete={autoComplete}
            defaultValue={state.values[name]}
            required
            minLength={type === "password" ? MIN_PASSWORD_LENGTH : undefined}
            maxLength={type === "password" ? MAX_PASSWORD_LENGTH : undefined}
          />
        </div>
      ))}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {errorText(error)}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
