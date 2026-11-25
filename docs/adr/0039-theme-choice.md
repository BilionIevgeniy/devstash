# 0039. A theme the visitor chooses: stored in the browser, applied before the first paint

- Status: accepted
- Date: 2026-11-25

## Context

`globals.css` held a light theme (`:root`) and the dark one (`.dark`), but `dark` was fixed on `<html>` and the toasts were `theme="dark"`: no visitor could reach the light theme. The final review pass (feature 25) listed what broke in light: texts written for a dark ground on the homepage, the type colours as text, the star, the destructive button, muted text on `--muted`.

The constraints come from earlier records:

- The root layout reads no cookie and no header, so `/`, `/de` and the legal pages stay static ([ADR 0024](0024-locale-decision.md), `ensureStatic` of [ADR 0037](0037-caching-strategy.md)). Whatever needs the request on every page cannot sit there.
- The Content-Security-Policy keeps `'unsafe-inline'` in `script-src` ([ADR 0036](0036-content-security-policy.md)), so an inline script needs no nonce or hash.
- A route the user left stays mounted but hidden (`<Activity>`), so one screen can hold two copies of a control.

## Decision

### Where the choice lives

- **`localStorage`, key `devstash-theme`, value `system`, `light` or `dark`** (`lib/theme.ts`). Written only when the visitor picks one. No cookie: nothing on the server would read it (the root layout may not, ADR 0024), so a cookie would only travel with every request. No column on the user: the choice belongs to the browser, works signed out, and needs no write.
- **Dark until a choice is made.** The product is dark first (`context/project-overview.md`). "System" follows `prefers-color-scheme`, live, but only once chosen: a visitor whose system is light still gets dark until they pick "System" or "Light".

### The first paint

- **An inline script in `<head>`** (`ThemeScript`, the string `THEME_SCRIPT`) reads the key and puts `dark` on `<html>` or takes it off while the browser parses, before React and before any paint. The server renders `dark` (the theme of a visitor who never chose and of a browser without JavaScript), and `<html>` has `suppressHydrationWarning`, so React keeps the script's class. `ThemeScript` is a client component so its `type` can be `text/plain` when React renders it in the browser (the pattern of Next's guide "Preventing flash before hydration"). The static pages stay `○`: the script reads the browser, never the request.
- **`ThemeSync`** (root layout and `global-error.tsx`) keeps the class right afterwards in a layout effect: a new choice, another tab (`storage` event), the system switching (matchMedia), a page restored from the back-forward cache, and every time React puts `<html>` back with only its own attributes (Strict Mode's remount in development, `global-error` and its retry). `global-error` is rendered in the browser into an empty document of Next's, where no inline script runs, so there ThemeSync alone sets the theme, before the paint.
- **One store** (`components/common/hooks/use-theme.ts`, a `useSyncExternalStore` like the consent's) serves the pickers, the user menu, ThemeSync and the toasts. It keeps the choice in memory too, so blocked or full storage still holds it for the tab; a page back from the cache reads storage again, unless the last write failed. Its server snapshot is "unknown", so a picker shows an inert placeholder of the same size until hydration is over, never a guess.
- **`color-scheme`** is `light` on `:root` and `dark` on `.dark`, so scrollbars and form controls follow.

### The controls

- `ThemePicker` (three native radios in one segmented control, no Radix, so the marketing bundle stays small) is the first section of `/settings` and sits in the copyright row of the marketing footer; the footer's columns are too narrow for its three choices. The radios are named with `useId`, since a page kept mounted under `<Activity>` holds a second picker and two radios of one name and no form would uncheck each other. `ThemeMenu` puts the same choice in the user menu, as a radio group with its own name next to the language.
- They are named "Appearance" / "Darstellung", not "Theme": the editor preferences already have a "Theme" for Monaco on the same page.

### The light theme

- **Tokens, dark values unchanged.** The marketing colours (`--brand`, `--dim`, `--raised`, `--chaos`), the gradient as text, the star (`--favorite`) and the toasts' texts move from fixed values to `:root` and `.dark`. In light only, `--muted-foreground` (0.5) and `--destructive` are darker, to reach 4.5:1 on `--muted` and on the destructive tint. The gradient fill stays the same in both themes, with `text-on-gradient` on it.
- **Type colours as ink.** A type's colour is data ([ADR 0031](0031-custom-item-types.md)) and a yellow note vanishes on white. Icons and texts take it through the variable `--type-color` and the utility `text-type`: the stored colour on dark, its lightness held at 0.5 at most on light (relative colour syntax, with `color-mix` against black for browsers without it), at least 4.8:1 on white and on `--muted` for every colour of the palette. `typeInk(color)` (`item-types/components/type-color.ts`) holds both halves, and `TypeIcon` takes `typeColor`; backgrounds and borders keep the stored colour. Stored colours and the palette do not change.
- **Not themed:** Monaco's editor themes are all dark, a choice of their own in the editor preferences, so a code block stays dark on a light page (its loading skeleton is light). The editor's window dots, the Open Graph image and the emails stay as they are.

### Tests

`e2e/theme.spec.ts` proves the first paint with every bundle of the page blocked, the default for a light system, "System" following the system live, and one choice carried from the homepage into the app and back (Activity). The axe scan of `e2e/a11y.spec.ts` and the screenshots of `e2e/visual.spec.ts` run in both themes (`-light` baselines). Storybook has a theme toolbar; CI runs the stories in dark, plus a light toast story. The whole story suite was run once in light while this was built.

## § 25 TDDDG

Writing the key is the visitor's own explicit choice of a setting they asked for; reading it on every page view is access to information in the terminal equipment as well (§ 25 (1)), as ADR 0034 itself reasons. Both are counted as strictly necessary to deliver the setting the visitor asked for (§ 25 (2) Nr. 2): the key holds only that setting, never leaves the browser, and a visitor who never chose has nothing stored. So no consent. Like the Sentry position of ADR 0034, this is a position, not settled law; the lawyer's check before live includes it (`context/todo-before-live.md`). The privacy notice and the processing record name the key.

## Consequences

- The choice is per browser, not per account: two people on one browser share it, and a new device starts dark.
- No control on the sign-in pages: they follow the stored choice, which is set on the homepage, in the app or in the settings.
- A colour that reads on one ground only is a bug: a component uses tokens or a `dark:` pair, and a type colour as ink goes through `typeInk` or `TypeIcon`'s `typeColor` ("Styling" in `coding-standards.md`).
- Light stories are not gated by CI; a new state whose colours differ in light gets a light story of its own (`globals: { theme: "light" }`).
- An inline script is part of every page. A later nonce-based CSP (ADR 0036) would need the script's hash.
