import type { EditableFields } from "@/features/items/domain/item-fields";

/** The stored text of an item, as the update service reads it. */
export interface StoredText {
  title: string;
  description: string | null;
  content: string | null;
  language: string | null;
  url: string | null;
  tags: string[];
}

/** The text of an update, after its type dropped the fields it lacks. */
export interface UpdateText {
  title: string;
  description?: string | null;
  content?: string | null;
  language?: string | null;
  url?: string | null;
  tags: string[];
}

function sameTags(a: string[], b: string[]): boolean {
  const lower = (tags: string[]) =>
    new Set(tags.map((tag) => tag.toLowerCase()));
  const left = lower(a);
  const right = lower(b);
  return left.size === right.size && [...left].every((tag) => right.has(tag));
}

// Whether a save over the Free limit only changes the collections (ADR 0032):
// every text field the type has must equal what is stored, the tags as a set
// whatever their order or case, so the edit form's "collections only" mode
// passes and any rewrite of the text is refused. A field the update leaves out
// does not change.
export function changesOnlyCollections(
  fields: EditableFields,
  stored: StoredText,
  update: UpdateText,
): boolean {
  const same = (field: keyof StoredText, has: boolean) => {
    const value = update[field];
    return !has || value === undefined || value === stored[field];
  };
  return (
    update.title === stored.title &&
    same("description", true) &&
    same("content", fields.content) &&
    same("language", fields.language) &&
    same("url", fields.url) &&
    sameTags(update.tags, stored.tags)
  );
}
