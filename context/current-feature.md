# Current Feature: AI Auto-Tagging

## Status

In Progress

## Goals

- A Pro user clicks "Suggest Tags" (Sparkles, ghost) next to the Tags field in the create dialog and in the drawer's edit form, and gets 3-5 freeform tag suggestions from `gpt-6-luna` based on the item's title and content
- Each suggestion is a badge with accept (Check) and reject (X), with `aria-label`s; accepted tags join the comma-separated field (no duplicates, up to `TAGS_MAX`), and nothing is saved until the form's Save
- Free users see no button; the service refuses them anyway (Pro check through `getEntitlements`, then 20/hour and 100/day per user)
- Errors appear as a toast in plain words, the form keeps its input; logs hold the status, error code and token usage, never content
- The OpenAI foundation is in place for later AI features: `lib/openai.ts` (`generateStructured`), the `ai` module (rank 4), the shared access check and rate limits, and `canUseAi` reaching the drawer's edit form
- `PRO_PLAN_FEATURES` gets the AI tags line in the commit that ships it

## Notes

- Full spec: `context/features/ai-auto-tag-spec.md` (with the decisions of the architecture review, marked `[changed: architecture review 2026-11-07]`); reasons: `docs/ai-integration-plan.md` (§N cited in the spec)
- Before the code: a dedicated OpenAI project with a spend limit, the Node version on Vercel (`openai` 7 needs 22+), install `openai` and check its `.d.ts`
- Foundation files: `lib/openai.ts` with its test (lazy client, `timeout: 30_000`, `maxRetries: 1`; always `store: false`, `safety_identifier: sha256Hex(userId)`, `max_output_tokens`; `AiOutputError` on `incomplete`, refusal or empty parse; `aiErrorSummary`); `ai/domain/model.ts`, `input.ts` (`AI_INPUT_MAX`, `truncateForModel`), `rate-limits.ts`; `ai/schemas.ts`; `ai/_internal/services/access.ts`; `FEATURE_RANKS`, `architecture-rules.md`, `docs/modules.md`
- Auto-tag files: `ai/domain/tags.ts` (prompt, normalizing), `ai/services/auto-tags.ts` (title to 200 and content to 2,000 chars, silently; known OpenAI failures returned in their own words, the rest thrown), `ai/actions/auto-tags.ts` (`generateAutoTags`, no `refresh()`), `ai/components/SuggestTagsButton.tsx`, `ai/_internal/components/TagSuggestions.tsx`
- Rank order: `ai` (4) cannot import `items` (5). The button takes `title`, `content`, `hasTag`, `onAccept`; the case-insensitive `hasTag` and the merge `appendTag` are pure helpers in `items/domain/item-fields.ts` with their tests; `ai` has its own tag-length cap, no larger than `TAG_MAX`
- `ItemFields` gets `canUseAi`; the Tags field moves to `items/_internal/components/TagsField.tsx`
- `canUseAi` in the `ok` result of `openUserItem`, kept beside the detail (a save replaces `ItemDetailJson`): route `api/items/[id]` answers `{ item, canUseAi }`, `fetch-item-detail` and `ItemCopyButton` follow, `use-item-sheet` keeps it in `ready`, the intercepted drawer page passes it, and so does the full item page, which has the same edit form; `openUserItem` reads the plan once (`cache()` does nothing in a route handler)
- Responses API with `responses.parse` + `zodTextFormat`, strict `{ tags: string[] }`, `effort: "none"`, `verbosity: "low"`, 300 output tokens; never `temperature`/`top_p`; always check `status`
- Prompt: rules in `instructions`, content in `input`, content treated as data; output untrusted, normalized (lowercase, trim, dedupe, length, count)
- Tests: domain, schemas, `appendTag`, access and service with `@/lib/openai`, `@/lib/rate-limit`, `getEntitlements` mocked (refused before any OpenAI call), `lib/openai.ts` with the SDK mocked, `item-detail` and the route for `canUseAi`; first-day real-API checks (`zodTextFormat`, `effort: "none"` quality, `verbosity`)
- UI/UX rules that apply: pending state (`Suggesting…`, disabled), no layout shift (reserved row), not optimistic, errors keep the form, focus stays in the dialog/sheet

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
