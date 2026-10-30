# Current Feature: File & Image Upload (Cloudflare R2)

## Status

In Progress

## Goals

- Presigned upload: `files/actions/upload.ts` checks session, Pro entitlement and the declared size/MIME against `files/domain/file-rules.ts`; `files/services/presign-upload.ts` signs a PUT URL via `lib/r2.ts`; the browser PUTs straight to R2, no bytes through the server
- Confirm step: `HeadObject` reads the real size; an object over the limit is deleted and no item row is saved
- Object key stored under `users/<userId>/` on the item, never a URL; item reads in `items/queries.ts`, writes in `items/services/item.ts`
- `files/components/FileUpload.tsx` with drag-and-drop and progress from the browser's own PUT, used in the create item modal for file/image types
- Download through a signed GET URL: an `items` service checks ownership, then `files` signs the key; signed on render with the expiry rounded to a time bucket so browsers can cache images
- ItemDrawer: image preview for images, file info and a download button for files
- Delete a file item: R2 object first, then the row; if R2 fails the delete fails and can be retried
- Delete an account: purge `users/<userId>/` first and abort on failure, then delete the rows
- CORS on the R2 bucket allows PUT from the app origin
- Constraints:
  - Images, 5 MB: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg` (`image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/svg+xml`)
  - Files, 10 MB: `.pdf`, `.txt`, `.md`, `.json`, `.yaml`, `.yml`, `.xml`, `.csv`, `.toml`, `.ini` (`application/pdf`, `text/plain`, `text/markdown`, `application/json`, `application/x-yaml`, `text/yaml`, `application/xml`, `text/xml`, `text/csv`, `application/toml`; `.ini` as `text/plain`)

## Notes

- Spec: `context/features/file-image-spec.md`; decisions in ADR 0004 (direct upload to R2) and ADR 0005 (entitlements from the database)
- Creates the `files` feature (rank 3): folder, `FEATURE_RANKS` row and a `docs/modules.md` section in the commit with its first code
- `@aws-sdk/*` only in `lib/r2.ts`; tests for `files/domain/file-rules.ts`
- Open: `getEntitlements` does not exist yet (no `billing` feature, nothing reads `isPro`); decide at `/feature start` how the Pro check gets it, through the architecture review
- Pro comes from a minimal `billing` (a `Subscription` table, `getEntitlements`, `isProStatus`), the foundation of `stripe-phase-1-spec`. Without Stripe the only Pro user is `demo@devstash.io`, through migration `demo_user_pro` (dev now, production on deploy); everyone else sees File and Image disabled with a PRO badge
- Expand/contract: `Subscription` and `Item.fileKey` were added without dropping `User.isPro`/`stripe*` and `Item.fileUrl`, so the previous deployment and a rollback keep working; the drop is in `context/todo.md`
- Account deletion moved from `auth` into the new `account` feature (rank 8): verify (a `VerifiedDeletion` only `auth` can build), purge R2, delete the rows, purge again best effort
- Verified against the bucket (2026-10-30, script in the scratchpad): CORS for localhost:3000 and devstash.ievgenbilion.de, a PUT with another Content-Type is refused (the SDK had to be told to sign `content-type`), signed GETs return the signed Content-Disposition and Cache-Control
- `.env.example` R2 values are placeholders; `R2_PUBLIC_URL` dropped. Open (owner): rotate the R2 API token in Cloudflare before the first commit, since the old values sat in a tracked file
- Open (owner): the browser checks listed in the session (uploads, drawer, delete, Free user, account delete)

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
