import "server-only";

import {
  hasPrismaCode,
  UNIQUE_VIOLATION_CODE,
} from "@/lib/postgres/prisma-errors";
import { hashPassword } from "@/features/auth/_internal/password";
import {
  deferLogged,
  type Defer,
} from "@/features/auth/_internal/services/defer";
import { VERIFICATION_EMAIL_BY_ADDRESS } from "@/features/auth/domain/rate-limits";
import { shouldResendVerification } from "@/features/auth/domain/registration";
import { getAccountState } from "@/features/auth/queries";
import { checkEmailSend } from "@/features/auth/services/email-rate-limit";
import type { Locale } from "@/i18n/config";
import { sendVerificationLink } from "@/features/auth/services/email-verification";
import { prisma } from "@/lib/postgres/prisma";

interface RegistrationInput {
  name: string;
  email: string;
  password: string;
}

// The outcome never tells a new address from a registered one, and the result
// of sending is not reported either: a failed send is already logged, the
// "Check your email" screen offers a resend, and a visible failure would again
// separate new addresses from existing ones. So would the time of a send, which
// runs after the answer for both; what is left is the insert of a new row.
export async function registerAccount(
  { name, email, password }: RegistrationInput,
  origin: string,
  ip: string | null,
  locale: Locale,
  defer: Defer,
): Promise<void> {
  // Hashed before the lookup so a new and an existing address cost the same.
  const hashedPassword = await hashPassword(password);
  // Counted for every address: the client's budget is visible (the open refusal
  // of Forgot password), so a unit used for a pending account alone would name
  // it. A new address gets its first link whatever the answer.
  const check = await checkEmailSend(VERIFICATION_EMAIL_BY_ADDRESS, email, ip);
  const existing = await getAccountState(email);

  if (existing) {
    // The submitted password is ignored: only the owner of a pending account
    // gets a fresh link, and confirming it needs the original password.
    if (shouldResendVerification(existing) && check.status === "allowed") {
      deferLogged(defer, () => sendVerificationLink(email, origin, locale));
    }
    return;
  }

  try {
    await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });
  } catch (error) {
    // A parallel registration of the same address won the race and sent the link.
    if (hasPrismaCode(error, UNIQUE_VIOLATION_CODE)) return;
    throw error;
  }

  deferLogged(defer, () => sendVerificationLink(email, origin, locale));
}
