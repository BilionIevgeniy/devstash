import { z } from "zod";

import { FILE_KINDS, FILE_NAME_MAX } from "@/features/files/domain/file-rules";

// No MIME type: the stored Content-Type is decided by the extension.
export const requestUploadSchema = z.object({
  kind: z.enum(FILE_KINDS, "Choose a file kind"),
  fileName: z
    .string()
    .trim()
    .min(1, "The file needs a name")
    .max(FILE_NAME_MAX, "The file name is too long"),
  size: z.number().int().positive("The file is empty"),
});

export type RequestUploadInput = z.infer<typeof requestUploadSchema>;
