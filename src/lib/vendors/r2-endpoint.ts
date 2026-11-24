// Where R2 is reached, apart from the SDK so that next.config.ts can read it
// for the Content-Security-Policy (ADR 0036) without loading the S3 client.

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1"]);

// The endpoint of the account, or R2_ENDPOINT for the stand-in of the
// end-to-end tests (scripts/fake-r2.ts). The SDK's own AWS_ENDPOINT_URL_S3
// loses to an explicit endpoint, so this is the one test hook in src
// (ADR 0035). Only a loopback host is taken, in every environment: a stray
// value on a deployment would send real users' files elsewhere.
export function r2Endpoint(
  accountId: string,
  override: string | undefined,
): { endpoint: string; forcePathStyle: boolean } {
  if (!override) {
    return {
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: false,
    };
  }
  if (!LOOPBACK_HOSTS.has(new URL(override).hostname)) {
    throw new Error("R2_ENDPOINT must point at localhost");
  }
  // The stand-in serves /<bucket>/<key>: a bucket subdomain of localhost
  // does not resolve everywhere.
  return { endpoint: override, forcePathStyle: true };
}

// The origin of the URLs the browser is handed (the presigned PUT, the signed
// GET of the gallery and the downloads). Without path style the SDK signs
// virtual-hosted URLs, so the bucket is a subdomain of the account's endpoint.
export function r2BrowserOrigin(
  accountId: string,
  bucket: string,
  override: string | undefined,
): string {
  const { endpoint, forcePathStyle } = r2Endpoint(accountId, override);
  const url = new URL(endpoint);
  if (!forcePathStyle) url.hostname = `${bucket}.${url.hostname}`;
  return url.origin;
}
