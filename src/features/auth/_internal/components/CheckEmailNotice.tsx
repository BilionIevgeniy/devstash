import Link from "next/link";

import { ResendVerificationButton } from "@/features/auth/components/ResendVerificationButton";

interface CheckEmailNoticeProps {
  email: string;
}

export function CheckEmailNotice({ email }: CheckEmailNoticeProps) {
  return (
    <div className="space-y-4 text-center">
      <h2 className="text-lg font-semibold">Check your email</h2>
      <p className="text-sm text-muted-foreground">
        We sent a verification link to{" "}
        <span className="font-medium text-foreground">{email}</span> if it
        isn&apos;t registered yet. Click it to activate your account, or sign in
        if you already have one.
      </p>
      <ResendVerificationButton email={email} />
      <Link
        href="/sign-in"
        className="block text-sm text-foreground underline-offset-4 hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}
