# Current Feature: File List View

## Status

In Progress

## Goals

- `/items/files` shows a single-column list of rows (like Google Drive/Dropbox) instead of grid cards
- Each row shows: file icon (by extension), file name, file size, upload date, download button
- Row hover highlight
- Clicking a row opens the ItemDrawer
- The download button triggers a direct download and stops propagation, so the drawer does not open
- Responsive: the row's info stacks vertically on mobile

## Notes

- Spec: `context/features/file-display-spec.md`
- Precedent: the image gallery. `src/app/(app)/items/[type]/page.tsx` already branches between `ImageGallery` and `ItemList` via `isGalleryType` in `items/domain/item-fields`; the file list becomes a third branch
- The drawer opens through `ItemDrawerTrigger`, reused by the rows as `ImageCard` does
- Downloads use a signed R2 URL, never a proxy; `_internal/services/file-urls` `signItemFile` is the one place an item upload is signed, so the listing likely needs a service like `getUserGalleryItems` that adds a download URL per item
- `items/[type]/loading.tsx` picks a skeleton by type: files need a list skeleton that mirrors the row size
- The icon-by-extension mapping is a pure rule: `domain/` with its test
- Plan goes to the architecture reviewer at `/feature start`

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
