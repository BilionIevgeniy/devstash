import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";

import { THEMES, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const THEME_ICONS: Record<Theme, LucideIcon> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

const GROUP_CLASS = "inline-flex gap-0.5 rounded-lg border p-0.5";
// One look for a choice and its placeholder, so nothing moves when the stored
// choice arrives. 44px on phones.
const CHOICE_CLASS =
  "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground max-md:min-h-11 [&_svg]:size-4 [&_svg]:shrink-0";

interface ThemePickerViewProps {
  /** Undefined until the stored choice has been read after hydration. */
  theme: Theme | undefined;
  onChange: (theme: Theme) => void;
  /** The legend's look where it sits (a footer heading, or hidden). */
  legendClassName?: string;
  className?: string;
}

// System, light or dark as three native radios (arrow keys move, each has a
// name) in one segmented control. The name comes from useId: a page kept
// mounted but hidden (Activity) holds a second picker, and two radios of one
// name and no form would uncheck each other. Until the choice is known, the
// same boxes without a control, hidden from assistive technology and, without
// JavaScript, from everyone (the picker needs it).
export function ThemePickerView({
  theme,
  onChange,
  legendClassName,
  className,
}: ThemePickerViewProps) {
  const t = useTranslations("common.theme");
  const name = useId();

  if (theme === undefined) {
    return (
      <div aria-hidden className={cn("no-script:hidden", className)}>
        <span className={cn("block", legendClassName)}>{t("label")}</span>
        <span className={GROUP_CLASS}>
          {THEMES.map((choice) => {
            const Icon = THEME_ICONS[choice];
            return (
              <span key={choice} className={CHOICE_CLASS}>
                <Icon />
                {t(choice)}
              </span>
            );
          })}
        </span>
      </div>
    );
  }

  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className={legendClassName}>{t("label")}</legend>
      <div className={GROUP_CLASS}>
        {THEMES.map((choice) => {
          const Icon = THEME_ICONS[choice];
          return (
            <label key={choice} className="cursor-pointer">
              <input
                type="radio"
                name={name}
                value={choice}
                checked={theme === choice}
                onChange={() => onChange(choice)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  CHOICE_CLASS,
                  "transition-colors hover:text-foreground peer-checked:bg-muted peer-checked:text-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                )}
              >
                <Icon aria-hidden />
                {t(choice)}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
