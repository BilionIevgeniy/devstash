# Current Feature: AI Summary

## Status

In Progress

## Goals

- An icon button (violet Sparkles) by the Description field of the create dialog, the drawer's edit form and the full item page, for Pro only (`canUseAi`)
- The AI buttons sit in the field's label row, so it is clear which field they belong to: the shared `Field` (`components/common/Field.tsx`) gets an optional `action` slot, and its label row becomes `flex justify-between` (label left, button right). Without `action` every other form looks as before
- Both buttons read "Generate with AI" ("Generating…" with a spinner while pending); a screen reader hears a hidden suffix ("for tags", "for description"), so the accessible name contains the visible text (WCAG 2.5.3). A small ghost button that does not make the label row taller
- Tags: the button moves from under the field into the `action` slot and is renamed from "Suggest tags with AI"; the suggested tag badges stay under the input, where they are now
- Description: the new button goes in the same place; the Accept / Dismiss preview shows under the textarea
- One click sends what is in the form right now, not what is saved: no Save needed first
- Works for every item type with whatever it has: title plus content (snippet, command, prompt, note), title plus URL (link), title plus file name (file, image: "File: name" / "Image: name"). Custom types have no content field yet, so only their title is sent. Only fields the current type shows are sent. Tags gain the file-name source too, on purpose
- `gpt-6-luna` writes a good, concise summary of 1-2 sentences for the description field
- The result is a preview with Accept and Dismiss; Accept fills `description`. If the field already has text, Accept replaces it and the preview says so. Nothing is saved until the form's own Save, so `useDirtyCloseGuard` works unchanged
- Pending state on the button, disabled while pending and when there is nothing to summarize; Accept disabled while a new request runs; no layout shift while it runs
- Focus: when the answer arrives it moves to the preview's Accept (the first badge for tags), back to the button when there is nothing to show; after Accept or Dismiss it returns to the button
- Each live region stays mounted as long as its button and only its text changes ("N tags suggested", "Summary ready")
- Failures in plain words through a toast (busy, unavailable, timeout, refused, limit), the form keeps the input. An answer that arrives after the form closed is dropped without a toast (both operations)
- Switching the type in the create dialog clears the preview; edits to title or content keep it on purpose
- Same access check and shared limits as auto-tagging (`checkAiAccess`: Pro, 20/hour, 100/day per user, 1,000/day for the app)
- "AI summaries" joins `PRO_PLAN_FEATURES`; the pricing page's extra line becomes "More AI features (Explain Code)"
- Unit tests: `normalizeSummary`, `itemInput`, the shared input schema, `aiSourceText`, `summarizeItem` with `lib/openai` mocked; `auto-tags.test.ts` stays green unchanged

## Notes

- Plan and reasons: `docs/ai-integration-plan.md` ("Summary" rows in §4, §5, §7 and the Summary section under §8). Auto-tagging is the reference implementation
- The architecture review (12 findings) was taken in full
- `ai` exports two composites, `AiTagSuggestions` and `AiDescriptionSummary`, each owning its hook, button ref, live region and result, and taking the field as a render prop `children(action)`. The button, preview, badges and hooks stay in `ai/_internal/`; `SuggestTagsButton` is replaced. `items` keeps only the field rules (`hasTag`, `appendTag`)
- Shared in `ai`: `aiItemInputSchema` (input of both operations), `itemInput()` (the `<item>` frame in `domain/input.ts`), `_internal/services/failed-call.ts` (known failure → message)
- Model settings: output `{ summary: string }`, `reasoning.effort: none`, `text.verbosity: low`, `max_output_tokens` 400, timeout 10 s; Server Action with one answer (not streamed)
- Input limits: title 200 characters, content 8,000 (`truncateForModel`)
- Length: the prompt asks for at most 300 characters; `normalizeSummary` caps at 500, cutting at the last sentence end, else at a word with "…"
- No migration: `Item.description` already exists
- `ItemFields` gets the file name as a prop: the upload's name in the create dialog, `detail.file.name` in the edit form
- Docs: `docs/modules.md` (`ai` and `items`), `docs/architecture.md`, `docs/ai-integration-plan.md` (status line, §11)

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
