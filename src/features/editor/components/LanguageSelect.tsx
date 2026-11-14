"use client";
import { useTranslations } from "next-intl";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  EDITOR_LANGUAGES,
  PLAIN_TEXT_LANGUAGE,
  languageOption,
} from "@/features/editor/domain/code-language";
import { useLanguageLabel } from "@/features/editor/components/hooks/use-language-label";

interface LanguageSelectProps {
  /** The trigger's id, so a field label points at it. */
  id?: string;
  value: string;
  /** Gets the language id, or "" for Plain text. */
  onChange: (value: string) => void;
}

// A searchable list of the languages the code editor highlights. The list
// opens on the current choice, so an extra Enter keeps it; picking the
// checked option again changes nothing. Free text no option matches shows as
// typed, with nothing checked, until another option is picked. Modal, so the
// list scrolls inside the dialog or sheet that holds the form.
export function LanguageSelect({ id, value, onChange }: LanguageSelectProps) {
  const label = useLanguageLabel();
  const t = useTranslations("editor");
  const [open, setOpen] = useState(false);
  const checked = languageOption(value);

  function pick(languageId: string) {
    onChange(languageId === PLAIN_TEXT_LANGUAGE ? "" : languageId);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{label(value)}</span>
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        aria-label={t("languages")}
        align="start"
        className="w-(--radix-popover-trigger-width) p-0"
      >
        <Command defaultValue={checked ?? undefined}>
          <CommandInput
            aria-label={t("searchLanguages")}
            placeholder={t("searchPlaceholder")}
          />
          <CommandList>
            <CommandEmpty>{t("noLanguage")}</CommandEmpty>
            {EDITOR_LANGUAGES.map((language) => (
              <CommandItem
                key={language.id}
                value={language.id}
                keywords={[language.label, ...language.aliases]}
                data-checked={language.id === checked}
                onSelect={() => pick(language.id)}
              >
                {language.id === PLAIN_TEXT_LANGUAGE
                  ? t("plainText")
                  : language.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
