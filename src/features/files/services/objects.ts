import "server-only";

import {
  contentDisposition,
  contentTypeFor,
  DOWNLOAD_CACHE_CONTROL,
  isUserKey,
  maxFileSize,
  signingWindowFor,
  tooLargeError,
  userPrefix,
  viewDisposition,
  type FileKind,
} from "@/features/files/domain/file-rules";
import type { FileUrls } from "@/features/files/types";
import { fail, ok, type OperationResult } from "@/lib/action-result";
import { deleteObject, deletePrefix, headObject, signGetUrl } from "@/lib/r2";

export type ConfirmUploadResult = OperationResult<{ size: number }>;

// Run after the browser's PUT and before the item row is saved. The signature
// binds the type and the length, and the real object is read here as a second
// check: an object over the limit or of another type than its key says is
// deleted, not kept.
export async function confirmUpload(
  userId: string,
  key: string,
  kind: FileKind,
): Promise<ConfirmUploadResult> {
  const expectedType = contentTypeFor(kind, key);
  if (!isUserKey(userId, key) || !expectedType) {
    return fail("uploadNotFound");
  }

  const object = await headObject(key);
  if (!object) return fail("uploadNotFound");

  if (object.size > maxFileSize(kind)) {
    await deleteObject(key);
    return fail(tooLargeError(kind));
  }
  if (object.contentType !== expectedType) {
    await deleteObject(key);
    return fail("wrongFileType");
  }

  return ok({ size: object.size });
}

// A key outside the user's prefix is refused, never deleted. R2 errors are
// thrown, so the caller keeps its row and the delete can be retried.
export async function deleteUserObject(
  userId: string,
  key: string,
): Promise<OperationResult> {
  if (!isUserKey(userId, key)) {
    return fail("uploadNotFound");
  }
  await deleteObject(key);
  return ok();
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
    sign(viewDisposition(key)),
    sign("attachment"),
  ]);
  return { viewUrl, downloadUrl };
}
