# Current Feature: Markdown Editor

## Status

In Progress

## Goals

- `MarkdownEditor` component with Write/Preview tabs, using `react-markdown` + `remark-gfm` (GitHub Flavored Markdown)
- Notes and prompts use `MarkdownEditor` instead of `Textarea`; snippets and commands keep `CodeEditor` unchanged
- Readonly mode shows only the Preview tab; edit mode defaults to Write with Preview available
- Matches `CodeEditor` styling: `bg-[#1e1e1e]` container, `bg-[#2d2d2d]` header with a copy button (same style as `CodeEditor`), fluid height up to 400px
- Preview styled through a `.markdown-preview` class in `globals.css`: distinct h1–h6, code blocks with dark background and monospace font, inline code with a subtle highlight, indented lists with bullets, blockquotes with a left border accent, blue links with hover, tables with borders and a header background

## Notes

- Spec names map to the current code:
  - NewItemDialog → `src/features/items/components/CreateItemDialog.tsx` (note and prompt content field)
  - ItemDrawer edit mode → `src/features/items/_internal/components/ItemEditForm.tsx` (note and prompt content field)
  - ItemDrawer view mode → `src/features/items/_internal/components/ItemDrawerContent.tsx` (readonly, note and prompt content)
- Placement: `docs/modules.md` lists `MarkdownEditor` and `MarkdownPreview` under the `editor` module ("Will grow with"), so the component goes in `src/features/editor/components/` next to `CodeEditor`; `items` imports it from there
- `react-markdown` and `remark-gfm` are not installed yet; install at `/feature start`
- Update `docs/modules.md` when the component lands: editor (Owns, Entry points, Private; drop both components from "Will grow with") and items ("Uses today")

### Deviations from the spec (on purpose)

- Theme tokens instead of `bg-[#1e1e1e]` / `bg-[#2d2d2d]`: the frame and header use the same tokens as `CodeEditor` (`bg-card`, `bg-muted/50`), which is what "match CodeEditor" means in this codebase, and they keep light mode working
- Readonly mode shows a static "Markdown" label in the header instead of a single Preview tab (a one-tab tablist is meaningless)
- `remark-breaks` on top of `remark-gfm`: a single newline is a line break, so existing plain-text notes and prompts (shown in `<pre>` until now) keep their line breaks

### Decisions from the architecture review

- Tabs: shadcn `Tabs` (Radix): arrow keys, `aria-controls`, triggers are `type="button"` so switching tabs never submits the form. The Write panel uses `forceMount`, so the textarea keeps its undo history; `MarkdownEditor` takes the `id` from `Field`, so the label focuses it
- Shared header: `editor/_internal/components/EditorHeader.tsx` (window dots, a slot for the label or tabs, copy button), used by both editors
- `MarkdownPreview` stays in `editor/_internal/` until a second consumer (`ai`) needs it
- Links: `urlTransform` stays the default (strips `javascript:`); the `a` override only adds `target="_blank"` and `rel="noopener noreferrer"`; raw HTML stays off
- Overflow: `pre` and tables scroll horizontally, long words wrap, so the narrow drawer never widens
- Colors: code backgrounds use `var(--muted)`, links `var(--color-blue-400)` with a hover underline
- Bundle: `CreateItemDialog` is on every page, so compare the build output before and after; load `MarkdownPreview` with `next/dynamic` only if the cost is noticeable
  - Measured: statically imported, the parser landed in a 192 KB (58 KB gzip) chunk loaded by all five `(app)` routes. With `next/dynamic` it is a separate 148 KB chunk listed only in the routes' `react-loadable-manifest.json`, fetched when a preview first renders. `.next/static/chunks`: 1124 KB before the feature, 1256 KB after
- Radix `TabsContent` with `forceMount` is always "present" and never sets `hidden`, so the inactive Write panel is hidden with `data-[state=inactive]:hidden`

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
