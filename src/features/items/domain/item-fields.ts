export interface EditableFields {
  content: boolean;
  language: boolean;
  url: boolean;
}

const CONTENT_TYPES = ["snippet", "prompt", "command", "note"];
const LANGUAGE_TYPES = ["snippet", "command"];
const URL_TYPES = ["link"];
const TAG_SEPARATOR = ",";
const TEXT_CONTENT_TYPE = "TEXT";
const URL_CONTENT_TYPE = "URL";

// The types the create dialog offers. File and image wait for uploads.
export const CREATABLE_TYPES = [
  "snippet",
  "prompt",
  "command",
  "note",
  "link",
] as const;

export type CreatableTypeName = (typeof CREATABLE_TYPES)[number];

// Which type-specific fields the edit form shows. File, image and custom types
// edit only the fields every item has.
export function editableFields(typeName: string): EditableFields {
  return {
    content: CONTENT_TYPES.includes(typeName),
    language: LANGUAGE_TYPES.includes(typeName),
    url: URL_TYPES.includes(typeName),
  };
}

// The contentType column of a new item: a link stores a URL, the rest text.
export function contentTypeFor(typeName: string): string {
  return URL_TYPES.includes(typeName) ? URL_CONTENT_TYPE : TEXT_CONTENT_TYPE;
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
