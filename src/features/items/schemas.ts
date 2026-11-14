import { z } from "zod";

import {
  fileExtension,
  FILE_NAME_MAX,
  type FileKind,
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
} from "@/features/items/domain/item-fields";
import {
  DEFAULT_ITEM_LIST_PARAMS,
  ITEM_LIST_SORTS,
  type ItemListParams,
} from "@/features/items/domain/list-params";
import { decodeListCursor } from "@/features/items/domain/list-cursor";
import {
  FAVORITE_CURSOR_KINDS,
  PINNED_CURSOR_KINDS,
} from "@/features/items/domain/list-pages";
import { PINNED_ITEM_SORTS } from "@/features/items/domain/pinned-items";
import type { ErrorCode } from "@/i18n/error-codes";
import { parsePage } from "@/lib/pagination";

// One code per kind: the kind is a word inside the sentence.
const UPLOAD_FIRST = {
  file: "uploadFileFirst",
  image: "uploadImageFirst",
} as const satisfies Record<FileKind, ErrorCode>;

// Prisma generates CUID v1 ids, which also match the cuid2 format.
export const itemIdSchema = z.cuid2("invalidItemId");

// The value a favorite toggle asks for, for items and collections alike.
export const favoriteValueSchema = z.boolean("invalidFavoriteValue");

// The value a pin toggle asks for.
export const pinValueSchema = z.boolean("invalidPinValue");

// `refresh: false` is for a caller that leaves the page itself.
export const deleteItemOptionsSchema = z
  .object({ refresh: z.boolean().default(true) })
  .default({ refresh: true });

function emptyToNull(value: string): string | null {
  return value === "" ? null : value;
}

function optionalText(max: number, message: ErrorCode) {
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
  .max(CONTENT_MAX, "contentTooLong")
  .transform((value) => (value.trim() === "" ? null : value))
  .nullable()
  .optional();

// A whole new content, such as an accepted AI rewrite: never blank, since it
// replaces what the user wrote.
export const itemContentSchema = z
  .string("invalidContent")
  .max(CONTENT_MAX, "contentTooLong")
  .refine((value) => value.trim() !== "", "contentEmpty");

const optionalUrl = z
  .string()
  .trim()
  .max(URL_MAX, "urlTooLong")
  .transform(emptyToNull)
  .pipe(z.url({ protocol: /^https?$/, error: "invalidUrl" }).nullable())
  .nullable()
  .optional();

// Counted after duplicates are dropped, so a tag typed twice is not refused.
const tagList = z
  .array(z.string().trim().min(1, "tagEmpty").max(TAG_MAX, "tagTooLong"))
  .transform((tags) => [...new Set(tags)])
  .pipe(z.array(z.string()).max(TAGS_MAX, "tooManyTags"));

const collectionIdList = z
  .array(z.cuid2("invalidCollectionId"))
  .transform((ids) => [...new Set(ids)])
  .pipe(z.array(z.string()).max(COLLECTIONS_MAX, "tooManyCollections"));

// A field left out is not changed; null clears it. The tags and the collections
// are always sent and replace the old ones as a whole.
export const updateItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "titleRequired")
    .max(TITLE_MAX, "titleTooLong"),
  description: optionalText(DESCRIPTION_MAX, "descriptionTooLong"),
  content: optionalContent,
  url: optionalUrl,
  language: optionalText(LANGUAGE_MAX, "languageTooLong"),
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
    .min(1, "fileNameRequired")
    .max(FILE_NAME_MAX, "fileNameTooLong"),
});

// The same fields as an update plus the type. A type that has a URL field
// needs one, a file or image type needs its upload, and only those types may
// carry one; other fields its type does not have are dropped by the service.
export const createItemSchema = updateItemSchema
  .extend({
    typeName: z.enum(CREATABLE_TYPES, "chooseItemType"),
    file: uploadedFile.optional(),
  })
  .superRefine((input, ctx) => {
    const fields = editableFields(input.typeName);
    if (fields.url && !input.url) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: "urlRequired" satisfies ErrorCode,
      });
    }
    if (fields.file && !input.file) {
      ctx.addIssue({
        code: "custom",
        path: ["file"],
        message: UPLOAD_FIRST[fields.file],
      });
    }
    if (!fields.file && input.file) {
      ctx.addIssue({
        code: "custom",
        path: ["file"],
        message: "typeHasNoFile" satisfies ErrorCode,
      });
    }
    if (
      input.file &&
      fileExtension(input.file.name) !== fileExtension(input.file.key)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["file", "name"],
        message: "fileNameMismatch" satisfies ErrorCode,
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

// The query of a next page of /favorites or of a /pinned group (ADR 0025).
// The sort falls back to the default like the page's URL does; a cursor that
// was not made for that sort is refused (400), never sent to the database.
const cursorTextSchema = z
  .string("invalidRequest")
  .max(2048, "invalidRequest")
  .optional();

export const favoritePageQuerySchema = z
  .object({ sort: favoriteItemSortSchema, cursor: cursorTextSchema })
  .transform(({ sort, cursor }, ctx) => {
    if (cursor === undefined) return { sort, after: null };
    const after = decodeListCursor(cursor, sort, FAVORITE_CURSOR_KINDS[sort]);
    if (after) return { sort, after };
    ctx.addIssue({ code: "custom", message: "invalidRequest" });
    return z.NEVER;
  });

export const pinnedPageQuerySchema = z
  .object({
    typeId: z
      .string("invalidRequest")
      .min(1, "invalidRequest")
      .max(64, "invalidRequest"),
    sort: pinnedItemSortSchema,
    cursor: cursorTextSchema,
  })
  .transform(({ typeId, sort, cursor }, ctx) => {
    if (cursor === undefined) return { typeId, sort, after: null };
    const after = decodeListCursor(cursor, sort, PINNED_CURSOR_KINDS[sort]);
    if (after) return { typeId, sort, after };
    ctx.addIssue({ code: "custom", message: "invalidRequest" });
    return z.NEVER;
  });
