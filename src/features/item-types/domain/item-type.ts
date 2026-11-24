import type { ItemTypeInfo } from "@/features/item-types/types";

const DEFAULT_TYPE_ICON = "File";
// The system types, in the order the sidebar and the forms show them.
export const SYSTEM_TYPE_NAMES = [
  "snippet",
  "prompt",
  "command",
  "note",
  "file",
  "image",
  "link",
] as const;
const SYSTEM_TYPE_ORDER = SYSTEM_TYPE_NAMES;

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
export interface ItemTypeRow {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
}

export function toItemTypeInfo(type: ItemTypeRow): ItemTypeInfo {
  return {
    id: type.id,
    name: type.name,
    slug: type.slug,
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

// The slug of a system type: its name plus "s" (the backfill of the migration
// item_type_slug and the seeds). A custom type's slug is stored with it.
export function systemTypeSlug(name: SystemTypeName): string {
  return `${name}s`;
}

/** The page of a type: the list of its items. */
export function typePagePath(slug: string): string {
  return `/items/${slug}`;
}

// The system type a URL segment names, or null for a custom type's slug. Only
// for what renders before the type is read (the skeletons of loading.tsx and
// the drawer); a page reads the type by its slug.
export function systemTypeNameForSlug(slug: string): SystemTypeName | null {
  return (
    SYSTEM_TYPE_ORDER.find((name) => systemTypeSlug(name) === slug) ?? null
  );
}
