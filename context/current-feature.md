# Current Feature: Pinned Items

## Status

In Progress

## Goals

- `toggleItemPin` server action exists
- Pin button in ItemDrawer is clickable (it exists today but has no onClick)
- Pin toggles optimistically for instant feedback
- Toast shows on success and on error
- Pinned items sort to the top of listings
- Pinned items appear in the pinned section on the dashboard

## Notes

- Spec: context/features/pinned-spec.md
- Follow the Favorite Button pattern
- Items only, not collections
- The Pin icon on ItemCard stays a static indicator

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
