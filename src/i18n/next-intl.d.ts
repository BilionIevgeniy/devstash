import type { FORMATS, Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";

// Typed keys and locales for every next-intl call: a key English does not have
// fails tsc (ADR 0024).
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
    Formats: typeof FORMATS;
  }
}
