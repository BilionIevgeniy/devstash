# Current Feature: AI Explain Code

## Status

In Progress

## Goals

- An "Explain" button (Sparkles) in the code editor header, next to Copy, for snippet and command items in the read view only (the drawers and the full item page), not in the create or edit forms
- Free users see a Crown icon with the tooltip "AI features require Pro subscription" instead of a working button
- A streaming route `app/api/ai/explain/route.ts`: auth, Zod validation (`ai/schemas.ts`), one call into `ai/services/explain.ts`, which runs the Pro check (`getEntitlements`) and the shared hourly and daily limits before the stream opens, then streams the answer as plain text
- The route answers 401, 400, 403 (not Pro) and 429 (limit) as JSON before streaming, sets `Cache-Control: private, no-store` and `maxDuration = 60`, and passes `request.signal` to OpenAI, so closing the drawer stops the generation
- `streamText` added to `lib/openai.ts` (missing today), with effort `low`, verbosity `medium`, `store: false`, `safety_identifier` and `max_output_tokens` 2,000 to start
- The code is cut to 8,000 characters before the call, and the UI says so when it was cut
- A concise explanation (~200-300 words) of what the code does and its key concepts
- After the first answer, Code / Explain tabs in the editor header switch between the two views; the explanation renders as markdown in the editor's own space and scrolls at the editor's maximum height
- Loading: a Loader2 spinner until the first words arrive, then the text grows in place
- Errors through a toast (Pro, limit, AI service). An error before any text returns to the Code tab; an error mid-stream keeps the text with a note that it was cut short; an abort shows nothing
- Not saved: regenerated on each click; the last explanation stays in component state, so switching tabs does not call again
- Unit tests: `ai/domain/explain.ts` (prompt, truncation) and the service with `@/lib/openai`, `@/lib/rate-limit` and `getEntitlements` mocked (Free and limited users refused before any OpenAI call)

## Notes

- Spec: `context/features/ai-explain-spec.md` (adapted to our architecture; `[changed: ...]` marks departures from the course). Full reasoning: `docs/ai-integration-plan.md` (§4 settings, §5 streaming route, §8 Explain Code, §9 output safety)
- `editor` (rank 3) cannot import `ai` (rank 4): `CodeEditor` gets two optional props, `headerActions` and `view`, and `items/_internal/components/ItemBody.tsx` fills them with the Explain button and the explanation from `ai`
- `MarkdownPreview` moves from `editor/_internal/` to `editor/components/` and gets a mode that drops images for AI output, so injected text cannot load an image URL that carries data out
- `canUseAi` already reaches the read view: `openUserItem` returns it (dashboard drawer through `GET /api/items/[id]`, the route drawer) and the full item page passes `isPro`. Check that `ItemBody` receives it
- The `ai` module already has `checkAiAccess`, `failedCall`, `aiItemInputSchema`, `truncateForModel`; the summary feature's `use-mounted-ref` pattern applies to the stream too (an abort shows nothing)
- After this, `PRO_PLAN_FEATURES` and the pricing page's "More AI features (Explain Code)" line need updating

### Architecture review (15 findings, all taken)

- Abort: the service tells a client abort apart and returns `aborted`; the route answers an empty 204 and logs nothing
- Deadlines: the SDK timeout ends when headers arrive, so the service combines signals: `request.signal`, an internal controller (aborted by the stream's `cancel()`), 15 s to the first text, 50 s in all (below `maxDuration` 60). A deadline is a `timeout`: before text a 503, after text the stream errors (cut short). A non-JSON error body shows `AI_UNAVAILABLE_MESSAGE`
- `language` is nullable in the schema; with none the "Language:" line is left out, otherwise `languageLabel` names it
- The live region lives in `AiCodeExplanation`, mounted the whole time
- Tabs: two buttons with `aria-pressed` in a `role="group"` (not Radix Tabs, whose parts would sit in two places). Explain and Regenerate are one button whose label changes; "Explaining…" while pending
- Free: the Crown is a link to `/upgrade` with an `aria-label`, plus a Tooltip for pointer users
- A failed Regenerate keeps the last text and tab until new text arrives; only a failed first request returns to Code
- Monaco is hidden while the explanation shows with its width kept (`invisible absolute`), so its height is not measured at width 0
- A successful stream ends with a sentinel line the client strips; a stream without it counts as cut short
- Text chunks collect in a ref and reach state once per animation frame
- `EditorHeader` unchanged: `headerActions` go into its existing `children` after the language label
- `MarkdownPreview` takes a required `images: "show" | "drop"`
- An empty answer is `AiOutputError("empty")`; the decoder is flushed after the last read; a 401 reads "Your session ended. Sign in again."
- CSRF: NextAuth's default `SameSite=Lax` cookie is enough (no override in `auth/nextauth`)
- Tests: `streamText` (store, safety identifier, incomplete, failed, refusal, empty), `explain.ts` with and without a language, `isCutForModel`, schema (null language, blank code), access reasons, the service (refusals before the call, failure before the first text, abort, deadline, mid-stream error, `cancel()`), the route (401, 400, 403, 429, 503, 500, 204, headers)

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
