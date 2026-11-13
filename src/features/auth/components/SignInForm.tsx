"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { signInWithCredentials } from "@/features/auth/actions/sign-in";
import { ResendVerificationButton } from "@/features/auth/components/ResendVerificationButton";
import { useErrorText } from "@/components/common/hooks/use-error-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ErrorCode, ErrorRef } from "@/i18n/error-codes";

interface SignInFormProps {
  callbackUrl: string;
  /** The error of a sign-in that came back through the URL (OAuth). */
  initialError?: ErrorCode;
}

export function SignInForm({ callbackUrl, initialError }: SignInFormProps) {
  const [state, formAction, isPending] = useActionState(
    signInWithCredentials,
    null,
  );
  const [email, setEmail] = useState("");
  const errorText = useErrorText();
  const error: ErrorRef | null =
    state && !state.success
      ? state
      : initialError
        ? { error: initialError }
        : null;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
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
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {errorText(error)}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
      {error?.error === "emailNotVerified" && (
        <ResendVerificationButton email={email} />
      )}
    </form>
  );
}
