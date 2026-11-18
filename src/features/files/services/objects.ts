import "server-only";

import {
  contentDisposition,
  contentTypeFor,
  DOWNLOAD_CACHE_CONTROL,
  isObjectKey,
  isUploadClaimable,
  isUserKey,
  maxFileSize,
  signingWindowFor,
  tooLargeError,
  UPLOADS_PREFIX,
  userPrefix,
  viewDisposition,
  type FileKind,
} from "@/features/files/domain/file-rules";
import type { FileUrls } from "@/features/files/types";
import { fail, ok, type OperationResult } from "@/lib/errors/action-result";
import {
  deleteObject,
  deleteObjects,
  deletePrefix,
  headObject,
  listObjectsPage,
  signGetUrl,
  type R2ObjectPage,
} from "@/lib/vendors/r2";

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
  // Too old to claim: the daily sweep may delete it at any moment. Not deleted
  // here, since a create sent again for an item that already holds the key
  // reaches this check too; the sweep removes it once no item holds it.
  if (!isUploadClaimable(object.lastModified, new Date())) {
    return fail("uploadNotFound");
  }

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

// One page of every upload of every user, for the daily sweep of unclaimed
// uploads in `items`, which owns the rows that claim them.
export function listUploadPage(
  continuationToken?: string,
): Promise<R2ObjectPage> {
  return listObjectsPage(UPLOADS_PREFIX, continuationToken);
}

// Deletes uploads by key, in one batch of at most a page. A key outside the
// scheme of the app is never deleted. Throws when R2 keeps any.
export async function deleteUploads(keys: string[]): Promise<void> {
  await deleteObjects(keys.filter(isObjectKey));
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
