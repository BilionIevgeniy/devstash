import "server-only";

import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  NotFound,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface R2Object {
  size: number;
  contentType: string | null;
}

export interface SignGetOptions {
  /** Signing at a fixed moment makes the URL the same for a whole window. */
  signingDate: Date;
  expiresIn: number;
  contentDisposition: string;
  cacheControl: string;
}

interface R2Config {
  client: S3Client;
  bucket: string;
}

let config: R2Config | undefined;

// Created on first use so a build never needs the credentials.
function getR2(): R2Config {
  if (config) return config;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY or R2_BUCKET_NAME is not set",
    );
  }

  config = {
    // Presigned URLs work only on this endpoint, not on a custom domain.
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
    bucket,
  };
  return config;
}

// The browser must send the same Content-Type, or R2 rejects the signature.
// The SDK signs only `host` by default, which lets any Content-Type through.
export function signPutUrl(
  key: string,
  contentType: string,
  expiresIn: number,
): Promise<string> {
  const { client, bucket } = getR2();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn, signableHeaders: new Set(["content-type"]) },
  );
}

export function signGetUrl(
  key: string,
  options: SignGetOptions,
): Promise<string> {
  const { client, bucket } = getR2();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: options.contentDisposition,
      ResponseCacheControl: options.cacheControl,
    }),
    { signingDate: options.signingDate, expiresIn: options.expiresIn },
  );
}

// null when there is no object under the key.
export async function headObject(key: string): Promise<R2Object | null> {
  const { client, bucket } = getR2();
  try {
    const head = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    );
    return {
      size: head.ContentLength ?? 0,
      contentType: head.ContentType ?? null,
    };
  } catch (error) {
    if (error instanceof NotFound) return null;
    throw error;
  }
}

// Deleting a missing key succeeds, so a retried delete is safe.
export async function deleteObject(key: string): Promise<void> {
  const { client, bucket } = getR2();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

// Pages through the prefix and throws if any object is left undeleted, so the
// caller can abort before it removes the rows that point to them.
export async function deletePrefix(prefix: string): Promise<void> {
  const { client, bucket } = getR2();
  let continuationToken: string | undefined;

  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    const keys = (page.Contents ?? []).flatMap(({ Key }) =>
      Key ? [{ Key }] : [],
    );
    if (keys.length > 0) {
      const result = await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: keys, Quiet: true },
        }),
      );
      if (result.Errors && result.Errors.length > 0) {
        throw new Error(
          `R2 kept ${result.Errors.length} objects under ${prefix}`,
        );
      }
    }
    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (continuationToken);
}
