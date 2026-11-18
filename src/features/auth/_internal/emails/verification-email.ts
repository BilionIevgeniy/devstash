import type { BuiltEmail } from "@/lib/html";
import {
  type ActionEmailCopy,
  buildActionEmail,
} from "@/features/auth/_internal/emails/action-email";
import { emailTranslator } from "@/i18n/email-translator";
import type { Locale } from "@/i18n/config";

export function buildVerificationEmail(
  verifyUrl: string,
  expiresInHours: number,
  locale: Locale,
): BuiltEmail {
  const t = emailTranslator(locale);
  const copy: ActionEmailCopy = {
    subject: t("verification.subject"),
    heading: t("verification.heading"),
    intro: t("verification.intro"),
    buttonLabel: t("verification.button"),
    ignoreNote: t("verification.ignore"),
    expiry: t("expiry", { hours: expiresInHours }),
  };
  return buildActionEmail(copy, verifyUrl);
}
