import {
  isSystemTypeName,
  systemTypeSlug,
  SYSTEM_TYPE_NAMES,
} from "@/features/item-types/domain/item-type";

// Custom item types of Pro users (ADR 0031).

export const TYPE_NAME_MAX = 40;
// An abuse bound, far above real use: Pro is otherwise unlimited.
export const CUSTOM_TYPES_MAX = 50;
const SLUG_MAX = 40;
// The slug of a name with no Latin letter or digit in it ("Заметки").
const FALLBACK_SLUG = "type";

// The colours a custom type can take: the seven of the system types and five
// more. Hex values, since every type colour is rendered from ItemType.color
// (ADR 0031). A colour is never removed from this list: a type that stores it
// would fail the schema on an edit that does not touch it.
export const TYPE_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#f97316",
  "#fde047",
  "#6b7280",
  "#ec4899",
  "#10b981",
  "#ef4444",
  "#f59e0b",
  "#84cc16",
  "#06b6d4",
  "#6366f1",
] as const;

export type TypeColor = (typeof TYPE_COLORS)[number];

// The message key that names each colour for a screen reader (customTypes.colors).
export const TYPE_COLOR_KEYS = {
  "#3b82f6": "blue",
  "#8b5cf6": "violet",
  "#f97316": "orange",
  "#fde047": "yellow",
  "#6b7280": "gray",
  "#ec4899": "pink",
  "#10b981": "green",
  "#ef4444": "red",
  "#f59e0b": "amber",
  "#84cc16": "lime",
  "#06b6d4": "cyan",
  "#6366f1": "indigo",
} as const satisfies Record<TypeColor, string>;

export type TypeColorKey = (typeof TYPE_COLOR_KEYS)[TypeColor];

// The icons a type can take: those of the system types. TypeIcon maps each
// name to its component, typed by this list, so the two cannot drift.
export const TYPE_ICON_NAMES = [
  "Code",
  "Sparkles",
  "Terminal",
  "StickyNote",
  "File",
  "Image",
  "Link",
] as const;

export type TypeIconName = (typeof TYPE_ICON_NAMES)[number];

const RESERVED_SLUGS: ReadonlySet<string> = new Set(
  SYSTEM_TYPE_NAMES.flatMap((name) => [name, systemTypeSlug(name)]),
);

// A custom type never takes a system type's name, whatever its case, so a
// lookup by name and the field rules of items never mistake one for the
// other. Look-alikes ("Snippets", "Befehle") are the user's choice (ADR 0031).
export function isReservedTypeName(name: string): boolean {
  return isSystemTypeName(name.trim().toLowerCase());
}

// Two names of one user's types collide when they differ only in case.
export function sameTypeName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function trimDashes(value: string): string {
  return value.replace(/^-+|-+$/g, "");
}

// The URL segment a new type starts from: accents dropped ("Café" → "cafe"),
// lower case, every run of other characters one dash, at most 40 characters.
export function slugFromName(name: string): string {
  const ascii = name.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
  const slug = trimDashes(
    trimDashes(ascii.replace(/[^a-z0-9]+/g, "-")).slice(0, SLUG_MAX),
  );
  return slug === "" ? FALLBACK_SLUG : slug;
}

function isFree(slug: string, used: ReadonlySet<string>): boolean {
  return !RESERVED_SLUGS.has(slug) && !used.has(slug);
}

// The first slug from `base` that is neither a system slug nor one of the
// user's: base, base-2, base-3, … The base is shortened so the suffix fits.
export function freeSlug(base: string, taken: readonly string[]): string {
  const used = new Set(taken);
  if (isFree(base, used)) return base;
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const candidate = `${trimDashes(base.slice(0, SLUG_MAX - suffix.length))}${suffix}`;
    if (isFree(candidate, used)) return candidate;
  }
}
