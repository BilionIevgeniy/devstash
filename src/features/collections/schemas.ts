import { z } from "zod";

import {
  DESCRIPTION_MAX,
  NAME_MAX,
} from "@/features/collections/domain/collection-fields";
import { FAVORITE_COLLECTION_SORTS } from "@/features/collections/domain/favorite-sort";

export const collectionIdSchema = z.cuid2("Invalid collection id");

// The sort of favorite collections in the URL; anything else is the default.
export const favoriteCollectionSortSchema = z
  .enum(FAVORITE_COLLECTION_SORTS)
  .catch("newest");

// `refresh: false` is for a caller that leaves the page itself.
export const deleteCollectionOptionsSchema = z
  .object({ refresh: z.boolean().default(true) })
  .default({ refresh: true });

const collectionFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a name")
    .max(NAME_MAX, `The name can be up to ${NAME_MAX} characters`),
  description: z
    .string()
    .trim()
    .max(
      DESCRIPTION_MAX,
      `The description can be up to ${DESCRIPTION_MAX} characters`,
    )
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional(),
});

export const createCollectionSchema = collectionFieldsSchema;
export const updateCollectionSchema = collectionFieldsSchema;

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
