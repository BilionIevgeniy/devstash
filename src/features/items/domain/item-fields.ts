import type { FileKind } from "@/features/files/domain/file-rules";

export interface EditableFields {
  content: boolean;
  /** The content is code: shown and edited in the code editor. */
  codeEditor: boolean;
  language: boolean;
  url: boolean;
  /** The kind of upload the type stores, or null for a type without one. */
  file: FileKind | null;
}

const CONTENT_TYPES = ["snippet", "prompt", "command", "note"];
const CODE_TYPES = ["snippet", "command"];
const LANGUAGE_TYPES = ["snippet", "command"];
const URL_TYPES = ["link"];
// The item type name to the kind of upload it stores.
const FILE_TYPES: Record<string, FileKind> = { file: "file", image: "image" };
const TAG_SEPARATOR = ",";
const TEXT_CONTENT_TYPE = "TEXT";
const URL_CONTENT_TYPE = "URL";
const FILE_CONTENT_TYPE = "FILE";

// Upper bounds of what an item stores, far above real use (the longest demo
// content is about 1 500 characters) and low enough that one request cannot
// fill the database or turn into thousands of tag writes.
export const TITLE_MAX = 200;
export const DESCRIPTION_MAX = 2_000;
export const CONTENT_MAX = 100_000;
export const LANGUAGE_MAX = 50;
export const URL_MAX = 2_048;
export const TAGS_MAX = 20;
export const TAG_MAX = 50;
export const COLLECTIONS_MAX = 100;

// The types the create dialog offers. File and image need Pro (requiresPro).
export const CREATABLE_TYPES = [
  "snippet",
  "prompt",
  "command",
  "note",
  "link",
  "file",
  "image",
] as const;

export type CreatableTypeName = (typeof CREATABLE_TYPES)[number];

export function isCreatableType(
  typeName: string,
): typeName is CreatableTypeName {
  return (CREATABLE_TYPES as readonly string[]).includes(typeName);
}

// Which type-specific fields the forms show. The upload of a file or image is
// set when the item is created and is not edited afterwards; custom types
// edit only the fields every item has.
export function editableFields(typeName: string): EditableFields {
  return {
    content: CONTENT_TYPES.includes(typeName),
    codeEditor: CODE_TYPES.includes(typeName),
    language: LANGUAGE_TYPES.includes(typeName),
    url: URL_TYPES.includes(typeName),
    file: FILE_TYPES[typeName] ?? null,
  };
}

// What is wrong with the content of a form before it is sent, or null. The
// editors have no maxLength to stop a long paste, and the server refuses the
// same limit; a type without a content field has nothing to refuse. The
// error code and its params, as a failure carries them.
export function contentError(fields: EditableFields, content: string) {
  return fields.content && content.length > CONTENT_MAX
    ? ({ error: "contentTooLong", params: { max: CONTENT_MAX } } as const)
    : null;
}

interface TypeSpecificUpdate {
  title: string;
  content?: string | null;
  language?: string | null;
  url?: string | null;
}

export type EditableUpdate<T extends TypeSpecificUpdate> =
  { data: T } | { error: "urlRequired" };

// Keeps an update to the fields its type has, so a stray url on a note or
// content on an image never lands in the row. A field left out stays as it
// is; only an explicit null clears it, which a type with a URL field refuses.
export function editableUpdate<T extends TypeSpecificUpdate>(
  typeName: string,
  input: T,
): EditableUpdate<T> {
  const fields = editableFields(typeName);
  if (fields.url && input.url === null) return { error: "urlRequired" };

  const { content, language, url, ...common } = input;
  return {
    data: {
      ...common,
      ...(fields.content && content !== undefined && { content }),
      ...(fields.language && language !== undefined && { language }),
      ...(fields.url && url !== undefined && { url }),
    } as T,
  };
}

export type AiSourceKind = "content" | "url" | "file" | "none";

export interface AiSource {
  /** Which field the text comes from; the suggestions are stale once it changes. */
  kind: AiSourceKind;
  text: string;
}

const FILE_SOURCE_LABELS: Record<FileKind, string> = {
  file: "File",
  image: "Image",
};

// What the AI reads besides the title: only a field this type shows, so text
// left from another type in the create dialog is not sent. A file or image
// has no text, so its file name stands in ("Image: diagram.png"). A custom
// type edits no content, so it sends the title alone.
export function aiSource(
  fields: EditableFields,
  values: { content: string; url: string; fileName?: string | null },
): AiSource {
  if (fields.content) return { kind: "content", text: values.content };
  if (fields.url) return { kind: "url", text: values.url };
  if (fields.file) {
    const name = values.fileName?.trim() ?? "";
    const text = name && `${FILE_SOURCE_LABELS[fields.file]}: ${name}`;
    return { kind: "file", text };
  }
  return { kind: "none", text: "" };
}

// The types that store an upload are the Pro types.
export function requiresPro(typeName: string): boolean {
  return editableFields(typeName).file !== null;
}

export type TypeListing = "gallery" | "files" | "cards";

// How a type page lists its items: an image type as thumbnails in a gallery,
// a file type as rows of files, every other type as item cards.
export function typeListing(typeName: string): TypeListing {
  const file = editableFields(typeName).file;
  if (file === "image") return "gallery";
  if (file === "file") return "files";
  return "cards";
}

// Where a Free user downloads or deletes the files of a past subscription.
export const LOCKED_FILES_PATH = "/settings/locked-files";

// Whether the plan gives the user this type: a Pro type only on the Pro plan.
export function canUseType(typeName: string, isPro: boolean): boolean {
  return isPro || !requiresPro(typeName);
}

// Whether the user may create an item of this type now: a type the dialog
// offers, and one their plan gives them.
export function canCreateType(
  typeName: CreatableTypeName,
  isPro: boolean,
): boolean {
  return canUseType(typeName, isPro);
}

// The contentType column of a new item: a link stores a URL, a file or image
// an upload, the rest text.
export function contentTypeFor(typeName: string): string {
  if (URL_TYPES.includes(typeName)) return URL_CONTENT_TYPE;
  if (requiresPro(typeName)) return FILE_CONTENT_TYPE;
  return TEXT_CONTENT_TYPE;
}

// What the copy button of a card or the drawer puts on the clipboard: a text
// item's content, a link's URL. An upload has only a signed URL that expires,
// so nothing.
export function copyValueOf(item: {
  contentType: string;
  content: string | null;
  url: string | null;
}): string | null {
  if (item.contentType === TEXT_CONTENT_TYPE) return item.content;
  if (item.contentType === URL_CONTENT_TYPE) return item.url;
  return null;
}

// "react, hooks, ,react" becomes ["react", "hooks"]: trimmed, no empty entries,
// the first of each duplicate kept.
export function parseTagInput(input: string): string[] {
  const tags = input
    .split(TAG_SEPARATOR)
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");
  return [...new Set(tags)];
}

export const TAG_JOINER = ", ";

// Case-insensitive, so a suggested "react" counts as there when the field
// holds "React": two spellings would become two tags on save.
export function hasTag(input: string, tag: string): boolean {
  const wanted = tag.trim().toLowerCase();
  return parseTagInput(input).some((item) => item.toLowerCase() === wanted);
}

// Adds a tag to the comma-separated field. A tag already there leaves the
// field as the user typed it; null when the field is full (TAGS_MAX).
export function appendTag(input: string, tag: string): string | null {
  const tags = parseTagInput(input);
  if (hasTag(input, tag)) return input;
  if (tags.length >= TAGS_MAX) return null;
  return [...tags, tag.trim()].join(TAG_JOINER);
}
