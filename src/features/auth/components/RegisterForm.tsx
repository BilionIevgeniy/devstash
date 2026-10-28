"use client";

import { useState, type SubmitEvent } from "react";

import { CheckEmailNotice } from "@/features/auth/_internal/components/CheckEmailNotice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/features/auth/domain/password-reset";
const GENERIC_ERROR = "Something went wrong. Please try again.";

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

interface RegisterResponse {
  success: boolean;
  error: string | null;
}

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));

    if (values.password !== values.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError(null);
    setIsPending(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result: RegisterResponse = await response.json();
      if (result.success) {
        setPendingEmail(String(values.email));
        return;
      }
      setError(result.error ?? GENERIC_ERROR);
    } catch {
      setError(GENERIC_ERROR);
    }
    setIsPending(false);
  }

  if (pendingEmail) return <CheckEmailNotice email={pendingEmail} />;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
            required
            minLength={type === "password" ? MIN_PASSWORD_LENGTH : undefined}
            maxLength={type === "password" ? MAX_PASSWORD_LENGTH : undefined}
          />
        </div>
      ))}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
