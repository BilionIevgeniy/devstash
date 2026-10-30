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

// The types that store an upload are the Pro types.
export function requiresPro(typeName: string): boolean {
  return editableFields(typeName).file !== null;
}

// Whether the user may create an item of this type now: a type the dialog
// offers, and a Pro one only on the Pro plan.
export function canCreateType(
  typeName: CreatableTypeName,
  isPro: boolean,
): boolean {
  return isPro || !requiresPro(typeName);
}

// The contentType column of a new item: a link stores a URL, a file or image
// an upload, the rest text.
export function contentTypeFor(typeName: string): string {
  if (URL_TYPES.includes(typeName)) return URL_CONTENT_TYPE;
  if (requiresPro(typeName)) return FILE_CONTENT_TYPE;
  return TEXT_CONTENT_TYPE;
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
