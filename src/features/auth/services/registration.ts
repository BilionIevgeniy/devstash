import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { hashPassword } from "@/features/auth/_internal/password";
import { VERIFICATION_EMAIL_BY_ADDRESS } from "@/features/auth/domain/rate-limits";
import { shouldResendVerification } from "@/features/auth/domain/registration";
import { getAccountState } from "@/features/auth/queries";
import { checkEmailSend } from "@/features/auth/services/email-rate-limit";
import { sendVerificationLink } from "@/features/auth/services/email-verification";
import { prisma } from "@/lib/prisma";

interface RegistrationInput {
  name: string;
  email: string;
  password: string;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

// The outcome never tells a new address from a registered one, and the result
// of sending is not reported either: a failed send is already logged, the
// "Check your email" screen offers a resend, and a visible failure would again
// separate new addresses from existing ones.
export async function registerAccount(
  { name, email, password }: RegistrationInput,
  origin: string,
  ip: string | null,
): Promise<void> {
  // Hashed before the lookup so a new and an existing address cost the same.
  const hashedPassword = await hashPassword(password);
  const existing = await getAccountState(email);

  if (existing) {
    // The submitted password is ignored: only the owner of a pending account
    // gets a fresh link, and confirming it needs the original password.
    const check = shouldResendVerification(existing)
      ? await checkEmailSend(VERIFICATION_EMAIL_BY_ADDRESS, email, ip)
      : null;
    if (check?.status === "allowed") await sendVerificationLink(email, origin);
    return;
  }

  try {
    await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });
  } catch (error) {
    // A parallel registration of the same address won the race and sent the link.
    if (isUniqueViolation(error)) return;
    throw error;
  }

  await sendVerificationLink(email, origin);
}
