import { useTranslations } from "next-intl";

import { setTheme, useTheme } from "@/components/common/hooks/use-theme";
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { THEMES } from "@/lib/theme";

// The theme in the user menu (ADR 0039), on the same store as the pickers.
// Nothing is sent, so there is no pending state; the menu stays open, so the
// page is seen changing behind it. The menu opens only after hydration, so
// the choice is known by then.
export function ThemeMenu() {
  const t = useTranslations("common.theme");
  const theme = useTheme();

  return (
    <>
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
        {t("label")}
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup value={theme} aria-label={t("label")}>
        {THEMES.map((choice) => (
          <DropdownMenuRadioItem
            key={choice}
            value={choice}
            onSelect={(event) => {
              event.preventDefault();
              setTheme(choice);
            }}
          >
            {t(choice)}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  );
}
