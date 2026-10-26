"use client";

import { useState, useTransition, type SubmitEvent } from "react";
import { toast } from "sonner";

import { changePassword } from "@/features/auth/_internal/actions/account";
import { signOutUser } from "@/features/auth/actions/auth";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/features/auth/domain/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SUCCESS_MESSAGE = "Password updated. Please sign in again.";

const FIELDS = [
  {
    name: "currentPassword",
    label: "Current password",
    autoComplete: "current-password",
    isNewPassword: false,
  },
  {
    name: "newPassword",
    label: "New password",
    autoComplete: "new-password",
    isNewPassword: true,
  },
  {
    name: "confirmPassword",
    label: "Confirm new password",
    autoComplete: "new-password",
    isNewPassword: true,
  },
] as const;

export function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const currentPassword = String(formData.get("currentPassword"));
    const newPassword = String(formData.get("newPassword"));
    const confirmPassword = String(formData.get("confirmPassword"));

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (result.success) {
        // The change revoked every session, this one included; signing out
        // clears the cookie and redirects to /sign-in.
        toast.success(SUCCESS_MESSAGE);
        await signOutUser();
        return;
      }
      setError(result.error);
    });
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="font-medium">Change password</h3>
      <p className="text-sm text-muted-foreground">
        Enter your current password to set a new one.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 max-w-sm space-y-4">
        {FIELDS.map(({ name, label, autoComplete, isNewPassword }) => (
          <div key={name} className="space-y-2">
            <label htmlFor={name} className="text-sm font-medium">
              {label}
            </label>
            <Input
              id={name}
              name={name}
              type="password"
              autoComplete={autoComplete}
              required
              minLength={isNewPassword ? MIN_PASSWORD_LENGTH : undefined}
              maxLength={isNewPassword ? MAX_PASSWORD_LENGTH : undefined}
            />
          </div>
        ))}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Updating password…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
