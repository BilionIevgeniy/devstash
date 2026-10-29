import { z } from "zod";

import {
  CREATABLE_TYPES,
  editableFields,
} from "@/features/items/domain/item-fields";

// Prisma generates CUID v1 ids, which also match the cuid2 format.
export const itemIdSchema = z.cuid2("Invalid item id");

function emptyToNull(value: string): string | null {
  return value === "" ? null : value;
}

const optionalText = z
  .string()
  .trim()
  .transform(emptyToNull)
  .nullable()
  .optional();

// Not trimmed: leading whitespace is part of code. Only a blank field is null.
const optionalContent = z
  .string()
  .transform((value) => (value.trim() === "" ? null : value))
  .nullable()
  .optional();

const optionalUrl = z
  .string()
  .trim()
  .transform(emptyToNull)
  .pipe(z.url({ protocol: /^https?$/, error: "Enter a valid URL" }).nullable())
  .nullable()
  .optional();

const tagList = z
  .array(z.string().trim().min(1, "Tags cannot be empty"))
  .transform((tags) => [...new Set(tags)]);

// A field left out is not changed; null clears it.
export const updateItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: optionalText,
  content: optionalContent,
  url: optionalUrl,
  language: optionalText,
  tags: tagList,
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>;

// The same fields as an update plus the type. A type that has a URL field
// needs one; fields its type does not have are dropped by the service.
export const createItemSchema = updateItemSchema
  .extend({ typeName: z.enum(CREATABLE_TYPES, "Choose an item type") })
  .superRefine((input, ctx) => {
    if (editableFields(input.typeName).url && !input.url) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: "URL is required",
      });
    }
  });

export type CreateItemInput = z.infer<typeof createItemSchema>;
