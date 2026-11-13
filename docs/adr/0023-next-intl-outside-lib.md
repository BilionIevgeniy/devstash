# 0023. next-intl is used outside `lib`, and `src/i18n/` sits below it

- Status: accepted; the place of the request config amended by [0024](0024-locale-decision.md)
- Date: 2026-11-13

## Context

Vendor SDKs are imported only inside `src/lib` (architecture rules, "Rules"), so a feature calls our client and never the vendor. next-intl (4.x, chosen for feature 11: Server and Client Components, a documented setup without i18n routing) is different: its API is a set of React hooks and server functions (`useTranslations`, `getTranslations`, `NextIntlClientProvider`) that components and pages call where they render text. A wrapper in `lib` around each hook would add nothing but a second name for it.

The messages and the request config (which locale a request gets) also need a home that every layer can read: `lib/action-result.ts` types its error codes from the messages, and features and `app/` will read them.

## Decision

- **next-intl outside `lib`.** Components, hooks, pages and `src/i18n/` may import `next-intl`. It is not in `VENDOR_SDKS` in `eslint.config.mjs`. `domain/` still imports no package (lint), so it never reaches next-intl: it returns codes and keys
- **`src/i18n/`** holds config and messages only: `messages/<locale>/*.json`, `error-codes.ts` (the codes and their params), `error-text.ts` (codes to words), and later the request config and the type augmentation. It is the lowest layer: `lib`, `components`, features and `app` import it, and it imports none of them (an `import/no-restricted-paths` zone). A file there that reads the request (`next/headers`) starts with `import "server-only"`; the rest is imported by the browser too
- **Messages split by namespace.** The error texts are their own file (`messages/en/errors.json`), so the browser modules that check codes at run time (`firstIssue`, `routeError`) carry only that file and not the whole catalogue

## Options considered

- **A wrapper in `lib/i18n.ts`** re-exporting the hooks: rejected. It hides nothing, and the next-intl type augmentation (typed keys) applies to its own exports
- **A feature module `i18n` with a rank:** rejected for now. A rank is for product code that owns models or flows; config and messages that every rank reads fit below `lib`, like `components/ui`. The language switch (feature 11, step 3) goes in `app-shell`

## Consequences

- The vendor rule has one named exception, written in `context/architecture-rules.md`
- An upgrade of next-intl touches components directly; its breaking changes are read before a major bump
- The locale decision (cookie, `Accept-Language`, static `/` and `/de`) is recorded with the setup in feature 11, step 1
