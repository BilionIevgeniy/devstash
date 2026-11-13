import { z } from "zod";

import { FILE_KINDS, FILE_NAME_MAX } from "@/features/files/domain/file-rules";

// No MIME type: the stored Content-Type is decided by the extension.
export const requestUploadSchema = z.object({
  kind: z.enum(FILE_KINDS, "chooseFileKind"),
  fileName: z
    .string()
    .trim()
    .min(1, "fileNameRequired")
    .max(FILE_NAME_MAX, "fileNameTooLong"),
  size: z.number().int().positive("emptyFile"),
});

export type RequestUploadInput = z.infer<typeof requestUploadSchema>;
