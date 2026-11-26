# Current Feature: Polish before showing the project

Inline feature from the full scan of `src/` by `code-reviewer` (2026-11-26), at the owner's request.

## Status

In Progress

## Goals

- M1: a German page is German for assistive technology in every part, portals included (dialogs, sheets, menus, palette, toasts, consent banner): `<html lang>` follows the locale of the page
- M2: every page of the app and the auth pages has a title of its own in the tab and in history (WCAG 2.4.2), without reading the request in metadata (instant validation, ADR 0037)
- M3: paging a collection list, a collection and the locked files keeps the keyboard focus on the pagination and the header on screen, as the type page does
- L1: `ResendVerificationButton` passes a navigation through its `catch` (`unstable_rethrow`)
- L2: `NewItemButtonFallback` reads no request (a client component)
- L3: the item routes parse the id with `itemIdSchema`
- L4: the auth layout's metadata is static
- L5: `bilingual-date.ts` without the twin branches; `local-rate-limit.ts` described for both callers and moved to `lib/http/`
- Each with its test where it can be tested (the language of an open dialog, the page's title, the focus after paging)

## Notes

- Every change keeps `npm run test:instant` green; the screenshots may change only where a header stays on screen while paging

## Model

- Plan: opus (several routes, an a11y mechanism for the whole document)
- Implementation: sonnet
- architecture-reviewer: opus

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
