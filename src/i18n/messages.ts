import type { Locale } from "@/i18n/config";
import deAuth from "@/i18n/messages/de/auth.json";
import deBilling from "@/i18n/messages/de/billing.json";
import deCommon from "@/i18n/messages/de/common.json";
import deEmails from "@/i18n/messages/de/emails.json";
import deErrors from "@/i18n/messages/de/errors.json";
import deItemTypes from "@/i18n/messages/de/itemTypes.json";
import deMarketing from "@/i18n/messages/de/marketing.json";
import deShell from "@/i18n/messages/de/shell.json";
import enAuth from "@/i18n/messages/en/auth.json";
import enBilling from "@/i18n/messages/en/billing.json";
import enCommon from "@/i18n/messages/en/common.json";
import enEmails from "@/i18n/messages/en/emails.json";
import enErrors from "@/i18n/messages/en/errors.json";
import enItemTypes from "@/i18n/messages/en/itemTypes.json";
import enMarketing from "@/i18n/messages/en/marketing.json";
import enShell from "@/i18n/messages/en/shell.json";

// Every message of the interface, one JSON file per namespace and locale.
// English is the reference: its shape is the type of the keys (next-intl.d.ts),
// and `satisfies` makes tsc refuse a German file that lacks one of its keys.
// messages.test.ts checks the other direction (no German key English lacks)
// and that every message formats.

const EN = {
  auth: enAuth,
  billing: enBilling,
  common: enCommon,
  emails: enEmails,
  errors: enErrors,
  itemTypes: enItemTypes,
  marketing: enMarketing,
  shell: enShell,
};

export type Messages = typeof EN;
export type Namespace = keyof Messages;

const DE = {
  auth: deAuth,
  billing: deBilling,
  common: deCommon,
  emails: deEmails,
  errors: deErrors,
  itemTypes: deItemTypes,
  marketing: deMarketing,
  shell: deShell,
} satisfies Messages;

const MESSAGES: Record<Locale, Messages> = { en: EN, de: DE };

/** All messages of a locale, for the request config and a dynamic layout. */
export function messagesFor(locale: Locale): Messages {
  return MESSAGES[locale];
}

/** Some namespaces of a locale, for a static page that sends only what it shows. */
export function pickMessages<N extends Namespace>(
  locale: Locale,
  namespaces: readonly N[],
): Pick<Messages, N> {
  const messages = messagesFor(locale);
  return Object.fromEntries(
    namespaces.map((namespace) => [namespace, messages[namespace]]),
  ) as Pick<Messages, N>;
}
