import { useId } from "react";
import { useTranslations } from "next-intl";

import { Field } from "@/components/common/Field";
import { Input } from "@/components/ui/input";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import {
  TYPE_COLOR_KEYS,
  TYPE_COLORS,
  TYPE_ICON_NAMES,
  TYPE_NAME_MAX,
} from "@/features/item-types/domain/custom-type";
import type { CustomTypeInput } from "@/features/item-types/schemas";

interface CustomTypeFieldsProps {
  values: CustomTypeInput;
  onChange: <K extends keyof CustomTypeInput>(
    name: K,
    value: CustomTypeInput[K],
  ) => void;
}

const LEGEND_CLASS = "mb-2 block text-sm font-medium text-muted-foreground";
// The radio itself is hidden; its label shows the choice, and the ring marks
// the checked one and the keyboard focus.
const CHOICE_CLASS =
  "flex items-center justify-center rounded-md ring-offset-2 ring-offset-background peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring";

// Native radios: arrow keys move between the choices, and each has a name
// for a screen reader. The swatch is a colour of the fixed palette, set through
// `style` like every type colour (ADR 0031).
export function CustomTypeFields({ values, onChange }: CustomTypeFieldsProps) {
  const t = useTranslations("customTypes");
  const group = useId();
  return (
    <>
      <Field label={t("form.name")}>
        {(id) => (
          <Input
            id={id}
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
            maxLength={TYPE_NAME_MAX}
            required
          />
        )}
      </Field>
      <fieldset>
        <legend className={LEGEND_CLASS}>{t("form.icon")}</legend>
        <div className="flex flex-wrap gap-3">
          {TYPE_ICON_NAMES.map((icon) => (
            <label key={icon}>
              <input
                type="radio"
                name={`${group}-icon`}
                value={icon}
                checked={values.icon === icon}
                onChange={() => onChange("icon", icon)}
                className="peer sr-only"
              />
              <span className={`${CHOICE_CLASS} size-9 border`}>
                <TypeIcon
                  name={icon}
                  aria-hidden
                  className="size-4"
                  style={{ color: values.color }}
                />
              </span>
              <span className="sr-only">{t(`icons.${icon}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className={LEGEND_CLASS}>{t("form.color")}</legend>
        <div className="flex flex-wrap gap-3">
          {TYPE_COLORS.map((color) => (
            <label key={color}>
              <input
                type="radio"
                name={`${group}-color`}
                value={color}
                checked={values.color === color}
                onChange={() => onChange("color", color)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={`${CHOICE_CLASS} size-7 rounded-full`}
                style={{ backgroundColor: color }}
              />
              <span className="sr-only">
                {t(`colors.${TYPE_COLOR_KEYS[color]}`)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
