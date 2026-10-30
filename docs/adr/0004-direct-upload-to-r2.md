# 0004. Files go from the browser straight to R2

- Status: accepted
- Date: 2026-10-29 (revised the same day after the review of the course specs)

## Context

Pro users upload files and images, stored in Cloudflare R2. The course draft routes the bytes through an API route and adds a download proxy "to avoid CORS". Its limits are 5 MB for images and 10 MB for files. Two platform limits decide the question:

- Vercel rejects function request bodies over 4.5 MB on every plan ([limits](https://vercel.com/docs/functions/limitations)), so a 10 MB file cannot pass through any route handler
- Server Actions accept 1 MB bodies by default (`serverActions.bodySizeLimit` in `node_modules/next/dist/docs`)

## Options

1. **Proxy the bytes through a Server Action or a route handler.** One code path, but it fails above 4.5 MB and every byte costs function time.
2. **A presigned URL.** The server checks the user and the limits, signs a URL, and the browser sends the file to R2 itself.

## Decision

Option 2.

- **Upload:** `files/actions/upload.ts`, then `files/services/presign-upload.ts`, then `lib/r2.ts`. The service checks the Pro entitlement and the declared size and type, then signs a PUT. The browser PUTs to R2 and reports progress from its own request
- **Confirm:** R2 presigned URLs support GET, HEAD, PUT and DELETE but no POST policy, and a size limit cannot be signed ([R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)). After the PUT the server reads the size with `HeadObject` and deletes an oversize object before the item row is saved
- **Download:** a signed GET URL, issued by the service of the feature that owns the item after it checks ownership; no proxy. CORS does not apply to `<img>` or links, only to script reads, so the draft's reason for the proxy does not hold. The item stores the object key, and the URL is signed on render with the expiry rounded to a time bucket, so browsers can cache images
- **Keys:** objects live under `users/<userId>/`
- **Deletion:** deleting a file item deletes the R2 object first, then the row; if R2 fails, the delete fails and can be retried. Deleting an account purges the `users/<userId>/` prefix first and aborts on failure, then deletes the rows

## Consequences

- The R2 bucket needs CORS for PUT from the app origin; downloads and images need none
- The server never sees the bytes, so content checks (for example sniffing an SVG) need an extra range read
- Presigned URLs work only on the R2 endpoint, not on a custom domain (R2 docs above), and they expire after at most 7 days
- Verified against the bucket on 2026-10-30: R2 returns the signed `response-content-disposition` and `response-cache-control` on a GET (needed because browsers ignore `<a download>` across origins), and two signings in one window give the same URL. The same check found that the AWS SDK signs only `host` on a presigned PUT by default, so R2 took any `Content-Type`; `lib/r2.ts` signs `content-type` explicitly (`signableHeaders`), and a PUT with another type now gets 403
- An upload from another tab can land after the account purge: its signed PUT stays valid for 10 minutes and other sessions live until the user row is gone. `account` purges once more after the rows, as best effort, which leaves only a PUT landing within those 10 minutes after the deletion; the staging prefix below closes that too
- An upload that never becomes an item (the dialog closed, the file removed, the type switched, or the create failing after the upload) stays in R2 until the account is purged: deleting it on a failed create would break the retry, since the form still holds its key, and Remove in the form deletes nothing. It costs storage, not correctness, since no row points to it. Upgrade path: uploads go to a staging prefix with an R2 lifecycle rule that expires them, and the confirm step copies the object to `users/<userId>/`; or a sweep deletes keys no item holds
- No outbox table and no cron job for now. If deletions start to fail in practice, or account deletion needs a proof of deletion, the upgrade is a `FileDeletion` outbox processed by a cron route with retries (see "Background work" in [architecture.md](../architecture.md)). On the Vercel Hobby plan a cron job runs at most once a day ([cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing))
- `lib/r2.ts` is the only place that imports the AWS SDK; what the keys mean lives in `files/domain`
