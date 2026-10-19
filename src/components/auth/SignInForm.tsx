"use client";

import { useActionState, useState } from "react";

import { signInWithCredentials } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthActionState } from "@/types/auth";

const INITIAL_STATE: AuthActionState = {
  success: false,
  data: null,
  error: null,
};

interface SignInFormProps {
  initialError?: string;
}

export function SignInForm({ initialError }: SignInFormProps) {
  const [state, formAction, isPending] = useActionState(
    signInWithCredentials,
    INITIAL_STATE,
  );
  const [email, setEmail] = useState("");
  const error = state.error ?? initialError;

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
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
