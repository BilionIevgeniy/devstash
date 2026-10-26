"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type SubmitEvent } from "react";
import { toast } from "sonner";

import { resetPassword } from "@/features/auth/_internal/actions/password-reset";
import {
  INVALID_RESET_LINK_MESSAGE,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/features/auth/domain/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SUCCESS_MESSAGE = "Password updated. You can now sign in.";
const SIGN_IN_URL = "/sign-in";

const FIELDS = [
  { name: "password", label: "New password" },
  { name: "confirmPassword", label: "Confirm new password" },
] as const;

interface ResetPasswordFormProps {
  email: string;
  token: string;
}

export function ResetPasswordForm({ email, token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password"));
    const confirmPassword = String(formData.get("confirmPassword"));

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await resetPassword({
        email,
        token,
        password,
        confirmPassword,
      });
      if (result.success) {
        toast.success(SUCCESS_MESSAGE);
        router.push(SIGN_IN_URL);
        return;
      }
      setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {FIELDS.map(({ name, label }) => (
        <div key={name} className="space-y-2">
          <label htmlFor={name} className="text-sm font-medium">
            {label}
          </label>
          <Input
            id={name}
            name={name}
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            maxLength={MAX_PASSWORD_LENGTH}
          />
        </div>
      ))}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Updating password…" : "Update password"}
      </Button>
      {error === INVALID_RESET_LINK_MESSAGE && (
        <Link
          href="/forgot-password"
          className="block text-center text-sm text-foreground underline-offset-4 hover:underline"
        >
          Request a new reset link
        </Link>
      )}
    </form>
  );
}
