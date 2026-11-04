import { z } from "zod";

import {
  DESCRIPTION_MAX,
  NAME_MAX,
} from "@/features/collections/domain/collection-fields";

export const createCollectionSchema = z.object({
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

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
