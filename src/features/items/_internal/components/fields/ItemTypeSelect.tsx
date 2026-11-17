"use client";

import { Field } from "@/components/common/Field";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProBadge } from "@/features/billing/components/ProBadge";
import {
  canCreateType,
  CREATABLE_TYPES,
  type CreatableTypeName,
} from "@/features/items/domain/item-fields";

interface ItemTypeSelectProps {
  value: CreatableTypeName;
  onChange: (value: CreatableTypeName) => void;
  isPro: boolean;
  disabled?: boolean;
}

// A Pro type stays in the list for a Free user, disabled with a Pro badge.
export function ItemTypeSelect({
  value,
  onChange,
  isPro,
  disabled,
}: ItemTypeSelectProps) {
  const typeName = useTranslations("itemTypes");
  const t = useTranslations("items.fields");
  return (
    <Field label={t("type")}>
      {(id) => (
        <Select
          value={value}
          onValueChange={(next) => onChange(next as CreatableTypeName)}
          disabled={disabled}
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CREATABLE_TYPES.map((type) => {
              const isAllowed = canCreateType(type, isPro);
              return (
                <SelectItem key={type} value={type} disabled={!isAllowed}>
                  {typeName(`${type}.one`)}
                  {!isAllowed && <ProBadge />}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}
    </Field>
  );
}
