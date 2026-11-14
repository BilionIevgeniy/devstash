import {
  type ActionEmailCopy,
  buildActionEmail,
  type BuiltEmail,
} from "@/features/auth/_internal/emails/action-email";
import { emailTranslator } from "@/features/auth/_internal/emails/email-copy";
import type { Locale } from "@/i18n/config";

export function buildPasswordResetEmail(
  resetUrl: string,
  expiresInHours: number,
  locale: Locale,
): BuiltEmail {
  const t = emailTranslator(locale);
  const copy: ActionEmailCopy = {
    subject: t("reset.subject"),
    heading: t("reset.heading"),
    intro: t("reset.intro"),
    buttonLabel: t("reset.button"),
    ignoreNote: t("reset.ignore"),
    expiry: t("expiry", { hours: expiresInHours }),
  };
  return buildActionEmail(copy, resetUrl);
}
