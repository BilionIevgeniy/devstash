# Current Feature: Image Gallery View

## Status

In Progress

## Goals

- Image items are shown as thumbnail cards instead of the regular `ItemCard`
- The image list is a grid/gallery with 3 columns
- Each thumbnail keeps a 16:9 ratio (`aspect-video`)
- The image fills the card with `object-cover` (edges may be cropped)
- Subtle hover zoom: 5% scale (`scale-105`) with a 300ms transition

## Notes

- Spec: `context/features/image-display-spec.md`
- Today `/items/[type]` renders every type through `ItemList` (`md:grid-cols-2`) and `ItemCard`; the gallery applies to the image type only
- Images live in R2 under `users/<userId>/`; `Item` stores `fileKey`, never a URL. Signed URLs are made per item in `items/services/item-detail.ts` (`signFileUrls`) for the drawer, which renders a plain `<img>` (no `next/image`: short-lived signed URLs would all go through the optimizer). The list query does not sign URLs yet, so the cards need signed thumbnail URLs from a service
- No download proxy and no byte proxy (architecture rules)
- Skeleton in `items/[type]/loading.tsx` should mirror the gallery layout (no layout shift)

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
