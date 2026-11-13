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
import { ok, fail, type OperationResult } from "@/lib/action-result";
import { signPutUrl } from "@/lib/r2";
import { consumeRateLimit } from "@/lib/rate-limit";

export const PRO_ONLY_MESSAGE = "File uploads are a Pro feature";
const UPLOAD_URL_TTL_SECONDS = 10 * 60;

export type PresignUploadResult = OperationResult<PresignedUpload>;

// Checks what the browser declares and signs a PUT under the user's prefix.
// The checked size is part of the signature, so R2 refuses any other length,
// also on a second PUT to the same URL. The item create still confirms the
// object after the upload.
export async function presignUpload(
  userId: string,
  { kind, fileName, size }: RequestUploadInput,
): Promise<PresignUploadResult> {
  const { isPro } = await getEntitlements(userId);
  if (!isPro) return fail(PRO_ONLY_MESSAGE);

  const check = checkDeclaredFile(kind, fileName, size);
  if ("error" in check) return fail(check.error);

  // Counted only for a file that would be signed, so a refused type does not
  // use up the quota. Fails closed: an Upstash outage throws and the action
  // answers with its generic error.
  const limit = await consumeRateLimit(PRESIGN_BY_USER, userId);
  if (!limit.success) {
    return fail(getTooManyAttemptsMessage(limit.reset, Date.now()));
  }

  const key = objectKey(userId, randomUUID(), fileExtension(fileName));
  const uploadUrl = await signPutUrl(
    key,
    check.contentType,
    size,
    UPLOAD_URL_TTL_SECONDS,
  );
  return ok({ uploadUrl, key, contentType: check.contentType });
}
