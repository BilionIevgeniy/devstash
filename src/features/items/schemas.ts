import { z } from "zod";

import {
  fileExtension,
  FILE_NAME_MAX,
} from "@/features/files/domain/file-rules";
import { FAVORITE_ITEM_SORTS } from "@/features/items/domain/favorite-sort";
import {
  COLLECTIONS_MAX,
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
import {
  DEFAULT_ITEM_LIST_PARAMS,
  ITEM_LIST_SORTS,
  type ItemListParams,
} from "@/features/items/domain/list-params";
import { PINNED_ITEM_SORTS } from "@/features/items/domain/pinned-items";
import { parsePage } from "@/lib/pagination";

// Prisma generates CUID v1 ids, which also match the cuid2 format.
export const itemIdSchema = z.cuid2("Invalid item id");

// The value a favorite toggle asks for, for items and collections alike.
export const favoriteValueSchema = z.boolean("Invalid favorite value");

// The value a pin toggle asks for.
export const pinValueSchema = z.boolean("Invalid pin value");

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

// A whole new content, such as an accepted AI rewrite: never blank, since it
// replaces what the user wrote.
export const itemContentSchema = z
  .string("Invalid content")
  .max(CONTENT_MAX, `Content can be up to ${CONTENT_MAX} characters`)
  .refine((value) => value.trim() !== "", "Content cannot be empty");

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

const collectionIdList = z
  .array(z.cuid2("Invalid collection id"))
  .transform((ids) => [...new Set(ids)])
  .pipe(
    z
      .array(z.string())
      .max(COLLECTIONS_MAX, `Up to ${COLLECTIONS_MAX} collections`),
  );

// A field left out is not changed; null clears it. The tags and the collections
// are always sent and replace the old ones as a whole.
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
  collectionIds: collectionIdList,
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

// The URL state of the lists. A value that is missing, repeated (an array) or
// unknown falls back to the default; a parser here never throws.
type SearchParamValue = string | string[] | null | undefined;

const itemListSortSchema = z
  .enum(ITEM_LIST_SORTS)
  .catch(DEFAULT_ITEM_LIST_PARAMS.sort);

// Only the shape is checked. A well-formed tag the user has no item with still
// filters, and the page says that nothing matches.
const listTagSchema = z
  .string()
  .trim()
  .min(1)
  .max(TAG_MAX)
  .nullable()
  .catch(null);

export function parseItemListParams(
  searchParams: Record<string, SearchParamValue>,
): ItemListParams {
  return {
    sort: itemListSortSchema.parse(searchParams.sort),
    tag: listTagSchema.parse(searchParams.tag ?? null),
    page: parsePage(searchParams.page ?? undefined),
  };
}

export const favoriteItemSortSchema = z
  .enum(FAVORITE_ITEM_SORTS)
  .catch("newest");

export const pinnedItemSortSchema = z.enum(PINNED_ITEM_SORTS).catch("newest");
