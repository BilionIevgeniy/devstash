import {
  type ActionEmailCopy,
  buildActionEmail,
  type BuiltEmail,
} from "@/features/auth/_internal/emails/action-email";
import { emailTranslator } from "@/i18n/email-translator";
import type { Locale } from "@/i18n/config";

export function buildAccountDeletionEmail(
  deletionUrl: string,
  expiresInHours: number,
  locale: Locale,
): BuiltEmail {
  const t = emailTranslator(locale);
  const copy: ActionEmailCopy = {
    subject: t("deletion.subject"),
    heading: t("deletion.heading"),
    intro: t("deletion.intro"),
    buttonLabel: t("deletion.button"),
    ignoreNote: t("deletion.ignore"),
    expiry: t("expiry", { hours: expiresInHours }),
  };
  return buildActionEmail(copy, deletionUrl);
}
