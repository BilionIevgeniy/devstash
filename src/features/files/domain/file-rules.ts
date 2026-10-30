const MB = 1024 * 1024;
const HOUR_SECONDS = 60 * 60;

export const FILE_KINDS = ["image", "file"] as const;

export type FileKind = (typeof FILE_KINDS)[number];

interface FileKindRule {
  maxSize: number;
  /** Extension (lower case, no dot) to the Content-Type it is stored with. */
  contentTypes: Record<string, string>;
  tooLargeMessage: string;
}

// The type of a file is decided by its extension, never by the browser's
// File.type, which comes from the OS and is often empty or different
// (Windows reports .csv as application/vnd.ms-excel and .md as "").
const FILE_KIND_RULES: Record<FileKind, FileKindRule> = {
  image: {
    maxSize: 5 * MB,
    contentTypes: {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
    },
    tooLargeMessage: "Images can be up to 5 MB",
  },
  file: {
    maxSize: 10 * MB,
    contentTypes: {
      pdf: "application/pdf",
      txt: "text/plain",
      md: "text/markdown",
      json: "application/json",
      yaml: "application/x-yaml",
      yml: "application/x-yaml",
      xml: "application/xml",
      csv: "text/csv",
      toml: "application/toml",
      ini: "text/plain",
    },
    tooLargeMessage: "Files can be up to 10 MB",
  },
};

export const FILE_NAME_MAX = 255;
export const UNSUPPORTED_FILE_MESSAGE = "This file type is not supported";
export const EMPTY_FILE_MESSAGE = "The file is empty";

// A signed download URL stays the same for a whole window, so the browser can
// cache the image. It expires two windows after its signing moment, so it is
// valid for at least one full window after any render.
export const DOWNLOAD_WINDOW_SECONDS = HOUR_SECONDS;
export const DOWNLOAD_CACHE_CONTROL = `private, max-age=${DOWNLOAD_WINDOW_SECONDS}`;

export type DeclaredFileCheck = { contentType: string } | { error: string };

export interface SigningWindow {
  signingDate: Date;
  expiresIn: number;
}

// "Report.Final.PDF" gives "pdf"; a name without a dot gives "".
export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

export function contentTypeFor(
  kind: FileKind,
  fileName: string,
): string | null {
  return FILE_KIND_RULES[kind].contentTypes[fileExtension(fileName)] ?? null;
}

export function maxFileSize(kind: FileKind): number {
  return FILE_KIND_RULES[kind].maxSize;
}

export function tooLargeMessage(kind: FileKind): string {
  return FILE_KIND_RULES[kind].tooLargeMessage;
}

// The value for an <input type="file" accept>, as extensions: MIME types in
// accept depend on the OS the same way File.type does.
export function acceptedExtensions(kind: FileKind): string {
  return Object.keys(FILE_KIND_RULES[kind].contentTypes)
    .map((extension) => `.${extension}`)
    .join(",");
}

// What the browser declares before the upload. The real size is checked again
// after it (see confirmUpload), since a signed PUT cannot limit the size.
export function checkDeclaredFile(
  kind: FileKind,
  fileName: string,
  size: number,
): DeclaredFileCheck {
  const contentType = contentTypeFor(kind, fileName);
  if (!contentType) return { error: UNSUPPORTED_FILE_MESSAGE };
  if (size <= 0) return { error: EMPTY_FILE_MESSAGE };
  if (size > maxFileSize(kind)) return { error: tooLargeMessage(kind) };
  return { contentType };
}

// 980 B, 12.4 KB, 3.1 MB: one decimal below 100 of a unit, none above.
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

// The trailing slash keeps "users/abc" from matching "users/abcd/...".
export function userPrefix(userId: string): string {
  return `users/${userId}/`;
}

export function objectKey(
  userId: string,
  objectId: string,
  extension: string,
): string {
  return `${userPrefix(userId)}${objectId}.${extension}`;
}

// A key directly under the user's prefix, with no deeper path.
export function isUserKey(userId: string, key: string): boolean {
  const prefix = userPrefix(userId);
  if (!key.startsWith(prefix)) return false;
  const name = key.slice(prefix.length);
  return name !== "" && !name.includes("/");
}

export function signingWindowFor(now: Date): SigningWindow {
  const windowMs = DOWNLOAD_WINDOW_SECONDS * 1000;
  return {
    signingDate: new Date(Math.floor(now.getTime() / windowMs) * windowMs),
    expiresIn: 2 * DOWNLOAD_WINDOW_SECONDS,
  };
}

// RFC 6266: a plain ASCII filename for old clients, and filename* with the
// UTF-8 name. Quotes, backslashes, control and non-ASCII characters never
// reach the quoted part, so the name cannot break the header.
export function contentDisposition(
  type: "inline" | "attachment",
  fileName: string,
): string {
  const fallback = fileName.replace(/[^\x20-\x7e]|["\\]/g, "_");
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
