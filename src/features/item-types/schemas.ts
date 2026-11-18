import { z } from "zod";

import {
  isReservedTypeName,
  TYPE_COLORS,
  TYPE_ICON_NAMES,
  TYPE_NAME_MAX,
} from "@/features/item-types/domain/custom-type";

export const customTypeIdSchema = z.cuid2("invalidTypeId");

const typeName = z
  .string("typeNameRequired")
  .trim()
  .min(1, "typeNameRequired")
  .max(TYPE_NAME_MAX, "typeNameTooLong")
  .refine((name) => !isReservedTypeName(name), "typeNameReserved");

// The create and the edit of a custom type send the same fields: a rename is
// an edit, and the slug is never part of the input (ADR 0031).
export const customTypeInputSchema = z.object({
  name: typeName,
  icon: z.enum(TYPE_ICON_NAMES, "invalidTypeIcon"),
  color: z.enum(TYPE_COLORS, "invalidTypeColor"),
});

export type CustomTypeInput = z.infer<typeof customTypeInputSchema>;
