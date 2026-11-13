import type { Locale } from "@/i18n/config";
import deErrors from "@/i18n/messages/de/errors.json";
import enErrors from "@/i18n/messages/en/errors.json";

// Every message of the interface, one JSON file per namespace and locale.
// English is the reference: its shape is the type of the keys (next-intl.d.ts),
// and `satisfies` makes tsc refuse a German file that lacks one of its keys.
// messages.test.ts checks the other direction (no German key English lacks)
// and that every message formats.

const EN = {
  errors: enErrors,
};

export type Messages = typeof EN;
export type Namespace = keyof Messages;

const DE = {
  errors: deErrors,
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
