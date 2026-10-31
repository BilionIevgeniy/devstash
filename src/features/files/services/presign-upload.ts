import "server-only";

import { randomUUID } from "node:crypto";
import { getTooManyAttemptsMessage } from "@/features/auth/domain/rate-limits";
import { getEntitlements } from "@/features/billing/queries";
import {
  checkDeclaredFile,
  fileExtension,
  objectKey,
  PRESIGN_BY_USER,
} from "@/features/files/domain/file-rules";
import type { RequestUploadInput } from "@/features/files/schemas";
import type { PresignedUpload } from "@/features/files/types";
import type { OperationResult } from "@/lib/action-result";
import { signPutUrl } from "@/lib/r2";
import { consumeRateLimit } from "@/lib/rate-limit";

export const PRO_ONLY_MESSAGE = "File uploads are a Pro feature";
const UPLOAD_URL_TTL_SECONDS = 10 * 60;

export interface PresignUploadResult extends OperationResult {
  data: PresignedUpload | null;
}

// Checks what the browser declares and signs a PUT under the user's prefix.
// The size is not part of the signature (R2 cannot enforce one), so the item
// create confirms it after the upload.
export async function presignUpload(
  userId: string,
  { kind, fileName, size }: RequestUploadInput,
): Promise<PresignUploadResult> {
  const { isPro } = await getEntitlements(userId);
  if (!isPro) return { success: false, error: PRO_ONLY_MESSAGE, data: null };

  const check = checkDeclaredFile(kind, fileName, size);
  if ("error" in check)
    return { success: false, error: check.error, data: null };

  // Counted only for a file that would be signed, so a refused type does not
  // use up the quota. Fails closed: an Upstash outage throws and the action
  // answers with its generic error.
  const limit = await consumeRateLimit(PRESIGN_BY_USER, userId);
  if (!limit.success) {
    return {
      success: false,
      error: getTooManyAttemptsMessage(limit.reset, Date.now()),
      data: null,
    };
  }

  const key = objectKey(userId, randomUUID(), fileExtension(fileName));
  const uploadUrl = await signPutUrl(
    key,
    check.contentType,
    UPLOAD_URL_TTL_SECONDS,
  );
  return {
    success: true,
    error: null,
    data: { uploadUrl, key, contentType: check.contentType },
  };
}
