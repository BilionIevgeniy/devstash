# Current Feature: Audit Follow-ups

## Status

In Progress

## Goals

Follow-ups of the performance and architecture audit of 2026-11-04 (no refactor needed):

- A failed save or action keeps the form open with an error instead of the error page
- A failed signing request ends the upload as failed instead of staying at 0%
- A database error in the `jwt` callback no longer signs the user out
- Monaco is served from the app's own origin, with a fallback when it fails to load
- The signed PUT binds the exact file length
- `next dev` keeps database connections for 4 minutes
- `collections` reads item types through an `item-types` query; `updateItem` refreshes in the action

## Notes

- Free plan limits are not part of this: they belong to the Stripe specs in `featuresDRAFT/`
- Production latency is still to be measured (`context/todo.md`)

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
