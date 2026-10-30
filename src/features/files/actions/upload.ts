"use server";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { requestUploadSchema } from "@/features/files/schemas";
import { presignUpload } from "@/features/files/services/presign-upload";
import type { PresignedUpload } from "@/features/files/types";
import type { ActionResult } from "@/lib/action-result";

const GENERIC_ERROR = "The upload could not start. Please try again.";

function failure(error: string): ActionResult<null> {
  return { success: false, data: null, error };
}

// Signs the PUT; the browser then sends the file to R2 itself.
export async function requestUpload(
  data: unknown,
): Promise<ActionResult<PresignedUpload | null>> {
  const parsed = requestUploadSchema.safeParse(data);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await presignUpload(userId, parsed.data);
    if (!result.success || !result.data) {
      return failure(result.error ?? GENERIC_ERROR);
    }
    return { success: true, error: null, data: result.data };
  } catch (error) {
    console.error("Signing the upload failed:", error);
    return failure(GENERIC_ERROR);
  }
}
