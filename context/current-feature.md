# Current Feature: AI Prompt Optimization

## Status

In Progress

## Goals

- An "Optimize" button (Sparkles) in the read-only Markdown editor header of prompt items, next to Copy, in the read view only (both drawers and the full item page), not in the create or edit forms
- Free users see the same Crown link to `/upgrade` with the tooltip "AI features require Pro subscription" as Explain
- A streaming route `app/api/ai/optimize-prompt/route.ts`: auth, Zod validation (`ai/schemas.ts`), one call into `ai/services/prompt-optimizer.ts`, which runs the Pro check (`getEntitlements`) and the shared hourly and daily limits before the stream opens, then streams the answer as plain text
- The route answers 401, 400, 403 (not Pro) and 429 (limit) as JSON before streaming, sets `Cache-Control: private, no-store` and `maxDuration = 60`, and passes `request.signal` to OpenAI, so closing the drawer stops the generation
- Settings: effort `low`, verbosity `medium`, `max_output_tokens` 2,000; the prompt is cut to 8,000 characters before the call, and the UI says so when it was cut
- A prompt in `ai/domain/prompt-optimizer.ts`: refine the prompt (clarity, structure, constraints, output format) while keeping its intent and language; a prompt that is already good comes back nearly unchanged; the output is only the improved prompt, no commentary
- After the first answer, Original / Optimized toggle in the editor header; the optimized text renders as markdown with images dropped, in the editor's own space
- Loading: a Loader2 spinner until the first words arrive, then the text grows in place; a stream without the end sentinel counts as cut short
- "Use this prompt?" below the optimized text, with "Use this prompt" and "Discard":
  - Use this prompt saves it as the item's content through a new narrow items action (`replaceItemContent`, scoped by `userId`, `CONTENT_MAX` checked), "Saving…" while pending, a toast, then the view shows the new content
  - Discard returns to the original
  - Not offered while streaming or when the answer was cut short
- Errors through a toast (Pro, limit, AI service, save). An error before any text returns to Original; an error mid-stream keeps the text with a note that it was cut short; an abort shows nothing
- Not saved until accepted: regenerated on each click; the last answer stays in component state, so switching views does not call again
- Unit tests: `ai/domain/prompt-optimizer.ts` (prompt, truncation), the schema, the service with `@/lib/openai`, `@/lib/rate-limit` and `getEntitlements` mocked (Free and limited users refused before any OpenAI call, abort, deadline, mid-stream error), the route (401, 400, 403, 429, 503, 500, 204, headers), the new items service

## Notes

- Inline description: "Implement prompt optimization for the prompt item types. It should look at the current prompt and refine if needed, then ask if the user wants to use the updated prompt. Put the Optimize button in the header, much like the Explain button on snippets and commands"
- Reasoning: `docs/ai-integration-plan.md` (§4 settings row "Prompt optimization", §5 streaming route, §8 "Prompt optimization", file list under "Where the code goes")
- Departure from §8: the plan says the first version only compares and copies and writes nothing. The request asks to use the updated prompt, so accepting is a real save through a small content-only action rather than the edit form pre-filled. The architecture review at `/feature start` checks this
- `ai` (rank 4) cannot import `items` (rank 5): `ItemBody` passes the save as an `onAccept` prop; `editor` (rank 3) cannot import `ai`, so `MarkdownEditor` gets the same optional `headerActions` and `view` props as `CodeEditor`
- Reuse from Explain Code: `streamText` in `lib/openai.ts`, `stream-deadlines`, `use-frame-text`, `use-mounted-ref`, the stream decoder and sentinel, `ExplainViewToggle`, `ExplainButton` (check what can be shared rather than copied), `MarkdownPreview` with `images: "drop"`
- After this, `PRO_PLAN_FEATURES` and the pricing page's AI line need updating

### Architecture review (12 findings, all taken)

- The shared stream core is public: `ai/services/text-stream.ts` (`startTextStream`, `TextStreamStart`), used by both services and by `app/api/ai/_shared/stream-response.ts`
- Accept is one commit: `onAccept(prompt)` returns `() => void` (shows the saved detail) or `null`; the optimizer runs it with its own reset in one transition, re-wrapped after the await like `ItemEditForm`. Not a remount keyed on content, which would lose the focus target
- An answer with a Markdown image is not offered for Accept (`hasMarkdownImage`), with a note; Copy stays
- While saving, the Optimize button, the toggle and Discard are disabled
- Focus moves to the Optimize button before the reset after Accept or Discard
- The accept bar sits below the editor frame, outside it; `MarkdownEditor`'s `view` slot scrolls at 400px like `CodeEditor`'s
- `MarkdownEditor` gets optional `copyValue` and `copyLabel`: "Copy optimized prompt" on the Optimized view
- The save handler calls `unstable_rethrow` first, like `ItemEditForm`
- `items/_internal/components/PromptContent.tsx` holds the optimizer, the read-only editor and the save; `ItemBody` only picks it
- `STREAM_END_MARK` and `readStreamText` move to `ai/domain/text-stream.ts` with their tests; the settings use `AiStreamSettings`
- `canAcceptOptimizedPrompt({ complete, isPromptCut, text, original })` in `ai/domain/prompt-optimizer.ts`, tested: done, not cut, no image, differs after trim
- Tests: stream-core cases in `text-stream.test.ts`; the service tests keep refusals, the input built and the settings; route tests for both routes; `setUserItemContent` with P2025

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
