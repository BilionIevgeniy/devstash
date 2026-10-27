"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { requestPasswordReset } from "@/features/auth/_internal/actions/password-reset";
import { isTooManyAttemptsMessage } from "@/features/auth/domain/rate-limits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthActionState } from "@/features/auth/types";

const INITIAL_STATE: AuthActionState = {
  success: false,
  data: null,
  error: null,
};

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
    INITIAL_STATE,
  );
  const [email, setEmail] = useState("");

  // A new state object arrives with every submission, so each refusal toasts.
  useEffect(() => {
    if (isTooManyAttemptsMessage(state.error)) toast.error(state.error);
  }, [state]);

  if (state.success) {
    return (
      <div className="space-y-2 text-center">
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          If an account exists for{" "}
          <span className="font-medium text-foreground">{email}</span>, we sent
          a link to reset your password.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
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
      {state.error && !isTooManyAttemptsMessage(state.error) && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
