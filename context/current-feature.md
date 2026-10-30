# Current Feature: Code Editor

## Status

In Progress

## Goals

- `CodeEditor` component built on Monaco Editor with a dark theme
- Snippets and commands use `CodeEditor` instead of `Textarea`
- Notes, prompts and all other non-code types keep `Textarea`
- macOS-style window dots (red/yellow/green) at the top of the editor
- Quick copy button in the editor header, with the item's language next to it
- Works in both read-only (display) and edit modes
- Height grows with the content up to a max of 400px, then scrolls, with a scrollbar styled to match the theme

## Notes

- Spec: context/features/code-editor-spec.md
- `Textarea` for content is used today in `features/items/_internal/components/ItemEditForm.tsx` and `features/items/components/CreateItemDialog.tsx`; the read-only view in the item drawer also needs the editor
- Monaco is not installed yet: a new dependency (`@monaco-editor/react`, checked against the installed Next 16 / React 19), loaded on the client only since it needs browser APIs
- Where the component lives is decided at implementation: `items/_internal/components/` (the "start in `_internal/`" rule) or the planned `editor` feature (rank 3, owns UserPreference), which fits once editor preferences exist
- Styling: Tailwind v4 tokens in `globals.css`, no inline styles; Monaco's own theme colors go through `defineTheme`

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
