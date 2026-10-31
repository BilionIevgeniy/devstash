import {
  parseTagInput,
  type EditableFields,
} from "@/features/items/domain/item-fields";

// What the edit form holds: every field as the text in its input, tags as the
// comma-separated string.
export interface ItemFormValues {
  title: string;
  description: string;
  content: string;
  language: string;
  url: string;
  tags: string;
}

// Trimmed like the update schema trims it: "  " and "" are both empty.
function sameText(a: string, b: string): boolean {
  return a.trim() === b.trim();
}

// Content is not trimmed (indentation is part of code); only blank equals blank.
function sameContent(a: string, b: string): boolean {
  const aBlank = a.trim() === "";
  const bBlank = b.trim() === "";
  return aBlank || bBlank ? aBlank === bBlank : a === b;
}

// Tags are a set: order, spacing, empty entries and duplicates do not count.
function sameTags(a: string, b: string): boolean {
  const aTags = new Set(parseTagInput(a));
  const bTags = new Set(parseTagInput(b));
  return aTags.size === bTags.size && [...aTags].every((tag) => bTags.has(tag));
}

type TypeFieldValues = Partial<
  Pick<ItemFormValues, "content" | "language" | "url">
>;

// The type-specific fields the forms send: only those the type has, so a
// hidden field is never cleared and its key is not sent at all.
export function typeFieldValues(
  fields: EditableFields,
  values: ItemFormValues,
): TypeFieldValues {
  return {
    ...(fields.content && { content: values.content }),
    ...(fields.language && { language: values.language }),
    ...(fields.url && { url: values.url }),
  };
}

// Whether saving would change the item. A field the type does not have is not
// sent, so it is not compared either.
export function hasItemChanges(
  fields: EditableFields,
  initial: ItemFormValues,
  current: ItemFormValues,
): boolean {
  const unchanged =
    sameText(initial.title, current.title) &&
    sameText(initial.description, current.description) &&
    sameTags(initial.tags, current.tags) &&
    (!fields.content || sameContent(initial.content, current.content)) &&
    (!fields.language || sameText(initial.language, current.language)) &&
    (!fields.url || sameText(initial.url, current.url));
  return !unchanged;
}
