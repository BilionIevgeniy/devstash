import type { ItemTypeInfo } from "@/features/item-types/types";

const DEFAULT_TYPE_ICON = "File";
const SYSTEM_TYPE_ORDER = [
  "snippet",
  "prompt",
  "command",
  "note",
  "file",
  "image",
  "link",
] as const;

export type SystemTypeName = (typeof SYSTEM_TYPE_ORDER)[number];

export function isSystemTypeName(name: string): name is SystemTypeName {
  return (SYSTEM_TYPE_ORDER as readonly string[]).includes(name);
}

/** A translator of the `itemTypes` messages: `useTranslations("itemTypes")`. */
export type TypeLabelTranslator = (
  key: `${SystemTypeName}.${"one" | "other"}`,
) => string;

// The name of a type as the interface shows it: a system type in the words of
// the locale ("Snippets", "Befehle"), a custom type as its owner named it.
export function typeLabel(
  t: TypeLabelTranslator,
  name: string,
  form: "one" | "other",
): string {
  return isSystemTypeName(name) ? t(`${name}.${form}`) : name;
}
const TYPE_SLUG_SUFFIX = "s";

export interface ItemTypeRow {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export function toItemTypeInfo(type: ItemTypeRow): ItemTypeInfo {
  return {
    id: type.id,
    name: type.name,
    icon: type.icon ?? DEFAULT_TYPE_ICON,
    color: type.color ?? undefined,
  };
}

function systemTypePosition(name: string): number {
  const index = (SYSTEM_TYPE_ORDER as readonly string[]).indexOf(name);
  return index === -1 ? SYSTEM_TYPE_ORDER.length : index;
}

export function sortBySystemOrder<T extends { name: string }>(types: T[]): T[] {
  return [...types].sort(
    (a, b) => systemTypePosition(a.name) - systemTypePosition(b.name),
  );
}

export function typeSlug(name: string): string {
  return `${name}${TYPE_SLUG_SUFFIX}`;
}

export function parseTypeSlug(slug: string): string | null {
  if (!slug.endsWith(TYPE_SLUG_SUFFIX) || slug === TYPE_SLUG_SUFFIX)
    return null;
  return slug.slice(0, -TYPE_SLUG_SUFFIX.length);
}
