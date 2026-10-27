"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type SubmitEvent } from "react";
import { toast } from "sonner";

import { confirmEmail } from "@/features/auth/_internal/actions/email-verification";
import { ResendVerificationButton } from "@/features/auth/components/ResendVerificationButton";
import { isTooManyAttemptsMessage } from "@/features/auth/domain/rate-limits";
import {
  INVALID_LINK_ERROR,
  WRONG_CONFIRM_PASSWORD_MESSAGE,
} from "@/features/auth/domain/verification-token";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SUCCESS_MESSAGE = "Email verified. You can now sign in.";
const SIGN_IN_URL = "/sign-in";

interface ConfirmEmailFormProps {
  email: string;
  token: string;
}

export function ConfirmEmailForm({ email, token }: ConfirmEmailFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password"));

    setError(null);
    startTransition(async () => {
      const result = await confirmEmail({ email, token, password });
      if (result.success) {
        toast.success(SUCCESS_MESSAGE);
        router.push(SIGN_IN_URL);
        return;
      }
      if (isTooManyAttemptsMessage(result.error)) {
        toast.error(result.error);
        return;
      }
      setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
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
