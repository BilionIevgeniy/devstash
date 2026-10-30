import "server-only";

import {
  contentDisposition,
  contentTypeFor,
  DOWNLOAD_CACHE_CONTROL,
  isUserKey,
  maxFileSize,
  signingWindowFor,
  tooLargeMessage,
  userPrefix,
  type FileKind,
} from "@/features/files/domain/file-rules";
import type { FileUrls } from "@/features/files/types";
import type { OperationResult } from "@/lib/action-result";
import { deleteObject, deletePrefix, headObject, signGetUrl } from "@/lib/r2";

const UPLOAD_NOT_FOUND =
  "The upload was not found. Please upload the file again";
const WRONG_FILE_TYPE = "The uploaded file does not match its type";

export interface ConfirmUploadResult extends OperationResult {
  data: { size: number } | null;
}

// Run after the browser's PUT and before the item row is saved. The signed PUT
// cannot limit the size, so the real object is read here: an object over the
// limit or of another type than its key says is deleted, not kept.
export async function confirmUpload(
  userId: string,
  key: string,
  kind: FileKind,
): Promise<ConfirmUploadResult> {
  const expectedType = contentTypeFor(kind, key);
  if (!isUserKey(userId, key) || !expectedType) {
    return { success: false, error: UPLOAD_NOT_FOUND, data: null };
  }

  const object = await headObject(key);
  if (!object) return { success: false, error: UPLOAD_NOT_FOUND, data: null };

  if (object.size > maxFileSize(kind)) {
    await deleteObject(key);
    return { success: false, error: tooLargeMessage(kind), data: null };
  }
  if (object.contentType !== expectedType) {
    await deleteObject(key);
    return { success: false, error: WRONG_FILE_TYPE, data: null };
  }

  return { success: true, error: null, data: { size: object.size } };
}

// A key outside the user's prefix is refused, never deleted. R2 errors are
// thrown, so the caller keeps its row and the delete can be retried.
export async function deleteUserObject(
  userId: string,
  key: string,
): Promise<OperationResult> {
  if (!isUserKey(userId, key)) {
    return { success: false, error: UPLOAD_NOT_FOUND };
  }
  await deleteObject(key);
  return { success: true, error: null };
}

// Throws when an object survives, so the account delete aborts before the rows.
export async function purgeUserObjects(userId: string): Promise<void> {
  await deletePrefix(userPrefix(userId));
}

// The caller has checked that the key belongs to the user. Both URLs are signed
// at the start of the current window, so they repeat across renders and the
// browser cache can reuse the image.
export async function signFileUrls(
  key: string,
  fileName: string,
  now: Date,
): Promise<FileUrls> {
  const window = signingWindowFor(now);
  const sign = (type: "inline" | "attachment") =>
    signGetUrl(key, {
      ...window,
      contentDisposition: contentDisposition(type, fileName),
      cacheControl: DOWNLOAD_CACHE_CONTROL,
    });

  const [viewUrl, downloadUrl] = await Promise.all([
    sign("inline"),
    sign("attachment"),
  ]);
  return { viewUrl, downloadUrl };
}
