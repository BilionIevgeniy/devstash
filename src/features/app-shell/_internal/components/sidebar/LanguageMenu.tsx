import { unstable_rethrow } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { useErrorText } from "@/components/common/hooks/use-error-text";
import { setLocale } from "@/features/app-shell/actions/locale";
import { LOCALES, type Locale } from "@/i18n/config";

// The language of the app in the user menu. The menu stays open while the
// switch runs, so "Switching…" is seen; the refresh of the action brings the
// page back in the new language. The current language sends nothing.
export function LanguageMenu() {
  const t = useTranslations("common.language");
  const locale = useLocale();
  const errorText = useErrorText();
  const [isPending, startTransition] = useTransition();

  function choose(next: Locale) {
    startTransition(async () => {
      try {
        const result = await setLocale(next);
        if (!result.success) toast.error(errorText(result));
      } catch (error) {
        // A session that ended redirects to sign-in, which must go on.
        unstable_rethrow(error);
        toast.error(t("failed"));
      }
    });
  }

  return (
    <>
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
        {isPending ? t("switching") : t("label")}
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup value={locale}>
        {LOCALES.map((code) => (
          <DropdownMenuRadioItem
            key={code}
            value={code}
            lang={code}
            disabled={isPending || code === locale}
            onSelect={(event) => {
              event.preventDefault();
              choose(code);
            }}
          >
            {t(code)}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  );
}
