"use server";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { requestUploadSchema } from "@/features/files/schemas";
import { presignUpload } from "@/features/files/services/presign-upload";
import type { PresignedUpload } from "@/features/files/types";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";
import { firstIssue } from "@/lib/validation";

// Signs the PUT; the browser then sends the file to R2 itself.
export async function requestUpload(
  data: unknown,
): Promise<ActionResult<PresignedUpload>> {
  const parsed = requestUploadSchema.safeParse(data);
  if (!parsed.success) return firstIssue(parsed.error);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await presignUpload(userId, parsed.data);
    if (!result.success) return result;
    return ok(result.data);
  } catch (error) {
    await logger.error("Signing the upload failed", { error, userId });
    return fail("uploadStartFailed");
  }
}
