import type { Locale } from "@/i18n/config";
import deAccount from "@/i18n/messages/de/account.json";
import deAi from "@/i18n/messages/de/ai.json";
import deAuth from "@/i18n/messages/de/auth.json";
import deBilling from "@/i18n/messages/de/billing.json";
import deCollections from "@/i18n/messages/de/collections.json";
import deCommon from "@/i18n/messages/de/common.json";
import deEditor from "@/i18n/messages/de/editor.json";
import deEmails from "@/i18n/messages/de/emails.json";
import deErrors from "@/i18n/messages/de/errors.json";
import deFiles from "@/i18n/messages/de/files.json";
import deImportExport from "@/i18n/messages/de/importExport.json";
import deItemTypes from "@/i18n/messages/de/itemTypes.json";
import deItems from "@/i18n/messages/de/items.json";
import deMarketing from "@/i18n/messages/de/marketing.json";
import dePages from "@/i18n/messages/de/pages.json";
import deSearch from "@/i18n/messages/de/search.json";
import deShell from "@/i18n/messages/de/shell.json";
import enAccount from "@/i18n/messages/en/account.json";
import enAi from "@/i18n/messages/en/ai.json";
import enAuth from "@/i18n/messages/en/auth.json";
import enBilling from "@/i18n/messages/en/billing.json";
import enCollections from "@/i18n/messages/en/collections.json";
import enCommon from "@/i18n/messages/en/common.json";
import enEditor from "@/i18n/messages/en/editor.json";
import enEmails from "@/i18n/messages/en/emails.json";
import enErrors from "@/i18n/messages/en/errors.json";
import enFiles from "@/i18n/messages/en/files.json";
import enImportExport from "@/i18n/messages/en/importExport.json";
import enItemTypes from "@/i18n/messages/en/itemTypes.json";
import enItems from "@/i18n/messages/en/items.json";
import enMarketing from "@/i18n/messages/en/marketing.json";
import enPages from "@/i18n/messages/en/pages.json";
import enSearch from "@/i18n/messages/en/search.json";
import enShell from "@/i18n/messages/en/shell.json";

// Every message of the interface, one JSON file per namespace and locale.
// English is the reference: its shape is the type of the keys (next-intl.d.ts),
// and `satisfies` makes tsc refuse a German file that lacks one of its keys.
// messages.test.ts checks the other direction (no German key English lacks)
// and that every message formats.

const EN = {
  account: enAccount,
  ai: enAi,
  auth: enAuth,
  billing: enBilling,
  collections: enCollections,
  common: enCommon,
  editor: enEditor,
  emails: enEmails,
  errors: enErrors,
  files: enFiles,
  importExport: enImportExport,
  itemTypes: enItemTypes,
  items: enItems,
  marketing: enMarketing,
  pages: enPages,
  search: enSearch,
  shell: enShell,
};

export type Messages = typeof EN;
export type Namespace = keyof Messages;

const DE = {
  account: deAccount,
  ai: deAi,
  auth: deAuth,
  billing: deBilling,
  collections: deCollections,
  common: deCommon,
  editor: deEditor,
  emails: deEmails,
  errors: deErrors,
  files: deFiles,
  importExport: deImportExport,
  itemTypes: deItemTypes,
  items: deItems,
  marketing: deMarketing,
  pages: dePages,
  search: deSearch,
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
