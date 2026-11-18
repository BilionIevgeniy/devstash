"use client";

import { Field } from "@/components/common/Field";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProBadge } from "@/features/billing/components/ProBadge";
import {
  canUseType,
  CREATABLE_TYPES,
} from "@/features/items/domain/item-fields";

interface ItemTypeSelectProps {
  /** A system type's name or one of the user's custom types. */
  value: string;
  onChange: (value: string) => void;
  /** The user's custom types, after the system types, by their own names. */
  customTypeNames: readonly string[];
  isPro: boolean;
  disabled?: boolean;
}

// A Pro type stays in the list for a Free user, disabled with a Pro badge.
// So do the custom types a former Pro user keeps (ADR 0032): no new item of
// one until Pro again.
export function ItemTypeSelect({
  value,
  onChange,
  customTypeNames,
  isPro,
  disabled,
}: ItemTypeSelectProps) {
  const typeName = useTranslations("itemTypes");
  const t = useTranslations("items.fields");
  return (
    <Field label={t("type")}>
      {(id) => (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CREATABLE_TYPES.map((type) => {
              const isAllowed = canUseType(type, isPro);
              return (
                <SelectItem key={type} value={type} disabled={!isAllowed}>
                  {typeName(`${type}.one`)}
                  {!isAllowed && <ProBadge />}
                </SelectItem>
              );
            })}
            {customTypeNames.length > 0 && <SelectSeparator />}
            {customTypeNames.map((name) => (
              <SelectItem key={name} value={name} disabled={!isPro}>
                {name}
                {!isPro && <ProBadge />}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </Field>
  );
}
