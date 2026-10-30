# File Upload with Cloudflare R2

> Adapted to our architecture (paths: `context/architecture-rules.md`, "Old paths in specs"). The course wording is kept in `/Users/ievgenbilion/Programming/Projects/Devstash/featuresDRAFT.original/`. Changed requirements are marked `[changed: ...]`.

## Overview

Add file and image upload functionality using Cloudflare R2 storage.

## Requirements

- Presigned upload: `files/actions/upload.ts` checks the session, the Pro entitlement (`getEntitlements`), and the declared size and MIME type against `files/domain/file-rules.ts`, then calls `files/services/presign-upload.ts`, which signs a PUT URL through `lib/r2.ts`. The browser sends the file straight to R2. Bytes never pass through a Server Action or a route handler `[changed: ADR 0004, course: upload API route; Vercel rejects request bodies over 4.5 MB and the limits below are 5 and 10 MB]`
- Confirm step: after the PUT, the server reads the object size with `HeadObject`; an object over the limit is rejected and deleted before the item row is saved `[changed: ADR 0004; R2 presigned URLs cannot enforce a size limit]`
- Set CORS on the R2 bucket for PUT from the app origin (the browser PUT needs it; `<img>` and links do not)
- Reads in `items/queries.ts`, writes in `items/services/item.ts` for the item rows `[changed: course: lib/db/items.ts]`
- Create FileUpload component with drag-and-drop (`files/components/FileUpload.tsx`)
- Update create item modal to use FileUpload for file/image types
- Store files under `users/<userId>/` in the bucket, and store the object key on the item, never a URL
- Delete a file item: delete the R2 object first, then the row. If R2 fails, the delete fails and can be retried `[changed: ADR 0004, simplified: no outbox table or cron job yet]`
- Delete an account: purge the `users/<userId>/` prefix first and abort on failure, then delete the rows
- Download through a signed GET URL: an `items` service checks ownership, then asks `files` to sign the key. Sign on render, with the expiry rounded to a time bucket so browsers can cache images `[changed: ADR 0004, course: download proxy API route "avoids CORS issues"; CORS does not apply to <img> or links]`
- Add download button in ItemDrawer for file types
- Show upload progress indicator (from the browser's own PUT request)
- Display image preview for images, file info for files

## File Constraints

| Type   | Max Size | Extensions                                            |
| ------ | -------- | ----------------------------------------------------- |
| Images | 5 MB     | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`      |
| Files  | 10 MB    | `.pdf`, `.txt`, `.md`, `.json`, `.yaml`, `.yml`, `.xml`, `.csv`, `.toml`, `.ini` |

## MIME Types

**Images:**
- `image/png`
- `image/jpeg`
- `image/gif`
- `image/webp`
- `image/svg+xml`

**Files:**
- `application/pdf`
- `text/plain`
- `text/markdown`
- `application/json`
- `application/x-yaml`, `text/yaml`
- `application/xml`, `text/xml`
- `text/csv`
- `application/toml`
- `text/plain` (for `.ini`)
