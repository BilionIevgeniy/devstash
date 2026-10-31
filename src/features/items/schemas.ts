import { z } from "zod";

import {
  fileExtension,
  FILE_NAME_MAX,
} from "@/features/files/domain/file-rules";
import {
  CONTENT_MAX,
  CREATABLE_TYPES,
  DESCRIPTION_MAX,
  editableFields,
  LANGUAGE_MAX,
  TAG_MAX,
  TAGS_MAX,
  TITLE_MAX,
  URL_MAX,
  URL_REQUIRED_MESSAGE,
} from "@/features/items/domain/item-fields";

// Prisma generates CUID v1 ids, which also match the cuid2 format.
export const itemIdSchema = z.cuid2("Invalid item id");

// `refresh: false` is for a caller that leaves the page itself.
export const deleteItemOptionsSchema = z
  .object({ refresh: z.boolean().default(true) })
  .default({ refresh: true });

function emptyToNull(value: string): string | null {
  return value === "" ? null : value;
}

function optionalText(max: number, message: string) {
  return z
    .string()
    .trim()
    .max(max, message)
    .transform(emptyToNull)
    .nullable()
    .optional();
}

// Not trimmed: leading whitespace is part of code. Only a blank field is null.
const optionalContent = z
  .string()
  .max(CONTENT_MAX, `Content can be up to ${CONTENT_MAX} characters`)
  .transform((value) => (value.trim() === "" ? null : value))
  .nullable()
  .optional();

const optionalUrl = z
  .string()
  .trim()
  .max(URL_MAX, `The URL can be up to ${URL_MAX} characters`)
  .transform(emptyToNull)
  .pipe(z.url({ protocol: /^https?$/, error: "Enter a valid URL" }).nullable())
  .nullable()
  .optional();

// Counted after duplicates are dropped, so a tag typed twice is not refused.
const tagList = z
  .array(
    z
      .string()
      .trim()
      .min(1, "Tags cannot be empty")
      .max(TAG_MAX, `A tag can be up to ${TAG_MAX} characters`),
  )
  .transform((tags) => [...new Set(tags)])
  .pipe(z.array(z.string()).max(TAGS_MAX, `Up to ${TAGS_MAX} tags`));

// A field left out is not changed; null clears it.
export const updateItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(TITLE_MAX, `The title can be up to ${TITLE_MAX} characters`),
  description: optionalText(
    DESCRIPTION_MAX,
    `The description can be up to ${DESCRIPTION_MAX} characters`,
  ),
  content: optionalContent,
  url: optionalUrl,
  language: optionalText(
    LANGUAGE_MAX,
    `The language can be up to ${LANGUAGE_MAX} characters`,
  ),
  tags: tagList,
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>;

// A finished upload: the key the presign service built and the name the file
// had. The service confirms the object itself; the name is shown and goes
// into the download header, so it is bounded here.
const uploadedFile = z.object({
  key: z.string().min(1).max(512),
  name: z
    .string()
    .trim()
    .min(1, "The file needs a name")
    .max(FILE_NAME_MAX, "The file name is too long"),
});

// The same fields as an update plus the type. A type that has a URL field
// needs one, a file or image type needs its upload, and only those types may
// carry one; other fields its type does not have are dropped by the service.
export const createItemSchema = updateItemSchema
  .extend({
    typeName: z.enum(CREATABLE_TYPES, "Choose an item type"),
    file: uploadedFile.optional(),
  })
  .superRefine((input, ctx) => {
    const fields = editableFields(input.typeName);
    if (fields.url && !input.url) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: URL_REQUIRED_MESSAGE,
      });
    }
    if (fields.file && !input.file) {
      ctx.addIssue({
        code: "custom",
        path: ["file"],
        message: `Upload the ${fields.file} first`,
      });
    }
    if (!fields.file && input.file) {
      ctx.addIssue({
        code: "custom",
        path: ["file"],
        message: "This item type has no file",
      });
    }
    if (
      input.file &&
      fileExtension(input.file.name) !== fileExtension(input.file.key)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["file", "name"],
        message: "The file name does not match the upload",
      });
    }
  });

export type CreateItemInput = z.infer<typeof createItemSchema>;
