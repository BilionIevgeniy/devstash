import { useTranslations } from "next-intl";

import {
  languageLabel,
  languageOption,
  PLAIN_TEXT_LANGUAGE,
} from "@/features/editor/domain/code-language";

// The name of a stored language in the locale: "Plain text" (or "Nur Text")
// for none, the language's own name otherwise ("TypeScript" in every
// language), free text as it was typed.
export function useLanguageLabel(): (language: string | null) => string {
  const t = useTranslations("editor");
  return (language) =>
    languageOption(language) === PLAIN_TEXT_LANGUAGE
      ? t("plainText")
      : languageLabel(language);
}
