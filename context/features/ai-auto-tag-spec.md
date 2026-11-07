# AI Auto-Tagging

> Adapted to our architecture (paths: `context/architecture-rules.md`, "Old paths in specs") and to `docs/ai-integration-plan.md` (cited as "plan §N"). The course wording is kept in `/Users/ievgenbilion/Programming/Projects/Devstash/featuresDRAFT.original/`. Changed requirements are marked `[changed: ...]`.

## Overview

Add AI-powered tag suggestions for items using the OpenAI `gpt-6-luna` model `[changed: course: "gpt-5-nano", which leaves the API on 2026-12-11; plan §1]`. Users click a "Suggest Tags" button in the tags area, and the AI returns 3-5 freeform tag suggestions based on the item's title and content. Each suggestion has accept/reject controls. Pro-only feature with both UI-level and server-side gating. This is the first AI feature (plan §13), so it also builds the OpenAI foundation for the later ones: the vendor client, the `ai` module, the shared access check and the rate limits, and the plan reaching the drawer's edit form (`canUseAi`).

## Before the code

`[changed: not in the course; plan §13.1]`

- Create a dedicated OpenAI project with its own key and a project spend limit; `OPENAI_API_KEY` is already in `.env.example`
- Check the Node version of the Vercel project: `openai` 7 needs Node 22 or later. `package.json` declares `"engines": { "node": ">=22" }` (checked 2026-11-07: the project runs 24.x, and `OPENAI_API_KEY` is set for production)
- Install `openai` (7.53.0 when the plan was written) and read its `.d.ts` in `node_modules` before each API used, as the coding standards require

## Requirements

### Foundation

- `src/lib/openai.ts` (`import "server-only"`), the only file that imports `openai`, including `openai/helpers/zod` (the lint already enforces it). The client is created on first use, so a build needs no key, with `timeout: 30_000` and `maxRetries: 1` `[changed: course: SDK defaults, a 10-minute timeout; plan §4]`. It exports `generateStructured({ operation, model, instructions, input, schema, schemaName, effort, verbosity, maxOutputTokens, timeoutMs, userId })`, `AiOutputError`, `aiErrorKind`, `isAiSpendError` and `aiErrorSummary`. `streamText` is left to Explain Code. It knows nothing about tags
- `timeoutMs` goes to the SDK as a per-request timeout: 10 s for tags, so with the one retry a slow call holds the user's other actions (Server Actions run one at a time) for about 20 s at most, not a minute `[changed: architecture review 2026-11-07]`
- `aiErrorKind(error)` turns the SDK's errors into `busy`, `unavailable` (bad key, credit or spend limit), `timeout`, `refused` (refusal, content filter) or `failed` (an answer cut short or unparsable), and null for anything else. The service needs it because only `lib` may import the SDK's error classes `[changed: architecture review 2026-11-07]`
- A parse failure inside `responses.parse` (a `SyntaxError` or `ZodError`) becomes `AiOutputError("parse_failed")` `[changed: architecture review 2026-11-07]`
- `generateStructured` calls `responses.parse` with `zodTextFormat`, and always sends `store: false`, `safety_identifier: sha256Hex(userId)` (`lib/hash.ts`) and `max_output_tokens`, so no caller can forget them `[changed: not in the course; plan §4, §9]`. It throws `AiOutputError` when `status` is `incomplete`, the model refuses, or `output_parsed` is empty. It never sends `temperature` or `top_p`
- It logs the usage of every call: model, operation, input, output and reasoning tokens (`usage.output_tokens_details.reasoning_tokens`), never content `[changed: not in the course; plan §7]`
- Create the `ai` module (rank 4) in this commit: the folder, `ai: 4` in `FEATURE_RANKS` (`eslint.config.mjs`), its row in `context/architecture-rules.md` changed from planned to exists, and its section in `docs/modules.md` moved from "Planned modules" to "Existing modules"
- `ai/domain/model.ts`: `AI_MODEL = "gpt-6-luna"` and the settings of this operation: `reasoning.effort: "none"`, `text.verbosity: "low"`, `max_output_tokens: 300` (plan §4)
- `ai/domain/input.ts` with its test: `AI_INPUT_MAX` (100,000, the same ceiling as `CONTENT_MAX`, which `ai` cannot import from `items`), the per-operation limits, and `truncateForModel`
- `ai/domain/rate-limits.ts`: `AI_BY_USER_HOUR` (20 an hour) and `AI_BY_USER_DAY` (100 a day), applied through the existing `lib/rate-limit.ts` `consumeRateLimit` and shared by all AI features `[changed: course: 20/hour only, which allows a month of calls costing about as much as the Pro plan; plan §7]`
- `AI_BY_APP_DAY`: 1,000 calls a day for the whole app, checked after the user's limits, with its own words ("AI has reached its daily limit. Try again tomorrow."). Anyone can reach Pro through a test-mode checkout or many accounts, so only an app-wide counter bounds the bill: about $0.10 a day of tags `[changed: decided 2026-11-07, not in the course or the plan]`
- `ai/_internal/services/access.ts` with its test, in the order of `files/services/presign-upload.ts`: `getEntitlements(userId)` (not Pro returns `AI_PRO_ONLY_MESSAGE`), then the hourly policy, then the daily one (a refusal returns `getTooManyAttemptsMessage` of `auth/domain/rate-limits`). An Upstash outage throws `RateLimitUnavailableError`, so nothing reaches OpenAI unchecked (plan §5). `past_due` users pass: the check reads `isPro` only (plan §8)

### Auto-tagging

- `ai/schemas.ts` with its test: the input `{ title, content }`, strings with `AI_INPUT_MAX` as a hard ceiling, so a long item is truncated instead of refused; at least one of them not blank. The output schema is strict: `{ tags: string[] }`, with no bounds on the list: a strict schema may not enforce them, and `normalizeTags` keeps the count `[changed: architecture review 2026-11-07]`
- `ai/domain/tags.ts` with its test: the prompt and the normalizing. The rules go in `instructions`, the item in `input`, fixed text first and content last, and the instructions say the content is data to describe, not orders to follow `[changed: not in the course; plan §9]`. The normalizing lowercases and trims, drops empty tags and duplicates, caps each tag's length and the count. `ai` cannot import `TAG_MAX` from `items`, so the length cap is its own constant, no larger than `TAG_MAX` (50)
- `ai/services/auto-tags.ts` with its test: `suggestTags(userId, input)` runs the access check, truncates the title to 200 and the content to 2,000 characters with `truncateForModel` `[changed: architecture review 2026-11-07]`, calls `generateStructured`, and returns the normalized tags as an `OperationResult`. The caller passes the title and content; `ai` never reads items
- The service wraps only the model call: a failure `aiErrorKind` knows is returned as an expected failure in its own words (`AI_FAILURE_MESSAGES` in `ai/domain/messages.ts`), a spend or credit error is logged loudly, and anything else (an Upstash outage, a bug) throws to the action `[changed: architecture review 2026-11-07]`
- The daily limit has its own words, "Daily AI limit reached. Try again tomorrow.", since `getTooManyAttemptsMessage` counts in minutes `[changed: architecture review 2026-11-07]`
- `ai/actions/auto-tags.ts`: `generateAutoTags(data: unknown): Promise<ActionResult<string[] | null>>`, the shape of `items/actions/item.ts`: schema, `getSessionUser()` outside the `try`, one call into the service, `aiErrorSummary` in the `catch` with `AI_UNAVAILABLE_MESSAGE` to the user. No `refresh()`: nothing was written (plan §5)
- Truncation is silent: tags from the first 2,000 characters are good enough, so the UI does not say the item was cut `[changed: plan §7 says the UI names a cut; for tags it has no use]`

### UI

- `ai/components/SuggestTagsButton.tsx` (public: `items` uses it): Sparkles icon, ghost variant, label "Suggest Tags". Props: `title`, `content`, `hasTag(tag): boolean`, `onAccept(tag): boolean` (false when the field is full). It knows nothing about the Tags field; `items` decides what counts as present, case-insensitively, so `React` and `react` do not become two tags `[changed: architecture review 2026-11-07]`
- Every button is `type="button"`: they sit inside the create and edit `<form>` `[changed: architecture review 2026-11-07]`
- The action call rethrows a redirect with `unstable_rethrow`, like `saveItem`, so an expired session reaches sign-in instead of a toast `[changed: architecture review 2026-11-07]`
- While pending it is disabled and shows `Loader2` and `Suggesting…`. It is disabled when the title and content are both blank (plan §10)
- `ai/_internal/components/TagSuggestions.tsx`: the suggestions as badges under the field, each with accept (Check) and reject (X) controls with `aria-label`s ("Add tag react", "Dismiss tag react"). Suggestions the form already holds (`hasTag`) are not shown. Reject removes the badge; accept calls `onAccept` and removes it. The button's row is always there, so the form does not jump while pending. When a badge goes, the focus moves to the next badge, or to the Suggest button after the last one; the arrival of suggestions is announced once through a polite `aria-live` region `[changed: architecture review 2026-11-07]`
- The Sparkles icon marks the suggestions as AI output (plan §10)
- `items` does the merge, since `ai` (rank 4) cannot import `items` (rank 5) `[changed: not in the course; rank order]`. A new pure helper in `items/domain/item-fields.ts` with its test `appendTag(tagsInput, tag)` adds a tag to the comma-separated value through `parseTagInput`, leaves the field as typed when the tag is there in any case (`hasTag`), and returns null at `TAGS_MAX`, which `TagsField` answers with a toast. Nothing is saved until the form's own Save, so `useDirtyCloseGuard` works unchanged
- `items/_internal/components/ItemFields.tsx` gets a `canUseAi: boolean` prop. The Tags field moves to its own subcomponent, `items/_internal/components/TagsField.tsx`, which renders the input and, when `canUseAi`, `SuggestTagsButton` next to it. This keeps `ItemFields` inside the 80-line component limit. The suggestions read the title and the content, or the URL for a link: only a field the type shows
- Hide the Suggest Tags button for free users (Pro-only UI gating). The service check is the enforcement; the UI only follows it
- Tags are freeform (not limited to existing tags in the database)
- Not optimistic: the server decides the data, and there is nothing to roll back (UI/UX rules)
- Error handling via toast (not Pro, rate limit, AI service errors), with the form and its input left as they were. The words come from plan §6: "AI is busy. Try again in a moment." (OpenAI 429, 5xx), "AI is unavailable right now." (spend limit, bad key), "That took too long. Try again." (timeout), "AI could not answer this item." (refusal, content filter). Log the status and error code only, never the content

### The plan in the forms

`[changed: course: isPro via the session, which ADR 0005 forbids; plan §8. The plan put canUseAi in the Explain step; auto-tagging is first and needs it in the edit form]`

- Create dialog: `CreateItemDialog` already has `isPro`; it passes it to `ItemFields` as `canUseAi`
- Drawer edit form: `openUserItem` (`items/services/item-detail.ts`) adds `canUseAi: boolean` to its `ok` result, read from `getEntitlements`. `cache()` shares nothing in a route handler, where `GET /api/items/[id]` calls this, so `openUserItem` reads the plan once and decides both the lock (`canUseType`) and `canUseAi` from it, in place of `userCanUseType`. A type open to every plan now costs one read of the plan per open; accepted `[changed: architecture review 2026-11-07]`
- `canUseAi` stays beside the detail, not inside `ItemDetailJson`: after a save, `use-item-sheet` `handleSaved` replaces the detail with the action's result, which carries no plan. So:
  - `app/api/items/[id]/route.ts` answers `data: { item, canUseAi }`, with a type in `items/types.ts`; its test is updated
  - `fetch-item-detail.ts` returns that shape; `ItemCopyButton` takes `.item`
  - `use-item-sheet` keeps `canUseAi` in its `ready` state next to `detail`
  - `ItemDrawerContent` and `ItemEditForm` pass it down to `ItemFields`
  - The intercepted drawer page `app/(app)/items/[type]/@drawer/(.)[id]/page.tsx` passes `result.canUseAi` to `ItemRouteDrawerView`
- The full item page (`items/[type]/[id]`) renders the same edit form through `ItemDetailView`: the page reads `getEntitlements` (shared by `cache()` with its plan check) and passes `canUseAi` through `ItemDetailPage`. The prop is required everywhere, so the compiler finds a missed consumer `[changed: architecture review 2026-11-07]`

### Shipping

- Add the line for AI tag suggestions to `PRO_PLAN_FEATURES` in the commit that ships the feature (plan §8)
- Follow existing patterns

### Tests

`[changed: testing standard; course: unit tests for the server action. Plan §12]`

- `ai/domain`: tag normalizing (lowercase, trim, duplicates, empty, length, count), `truncateForModel` at and past the limit, the prompt keeps the content out of `instructions`
- `ai/schemas.ts`: over the ceiling, both fields blank
- `items/domain/item-fields`: `hasTag` across case; `appendTag` with a duplicate in another case, at `TAGS_MAX`, on an empty field
- `lib/openai.ts`: `aiErrorKind` on constructed SDK errors, a parse failure turned into `AiOutputError`
- `ai/services/auto-tags`: the title is truncated too
- `access.ts` and `auto-tags.ts`, with `@/lib/openai`, `@/lib/rate-limit` and `getEntitlements` mocked: a Free user and a limited user are refused before any OpenAI call; both the hourly and the daily policy are counted; an outage reaches no OpenAI call
- `lib/openai.ts`, with the SDK mocked: `incomplete`, a refusal and an empty parse all throw `AiOutputError`; `store: false` and `safety_identifier` are always sent
- `items/services/item-detail.test.ts` and the route test: `canUseAi` in the `ok` result and in the answer, and one `getEntitlements` call per open
- Against the real API, on the first day: one `responses.parse` with `zodTextFormat` on `gpt-6-luna`; tag quality with `effort: "none"` on a few real snippets; `text.verbosity` accepted by `gpt-6-luna`

## CRITICAL: OpenAI SDK gotchas

`[changed: course: "gpt-5-nano gotchas". Checked on 2026-11-07 against the OpenAI docs and the openai 7.53.0 types; plan §3]`

Use the **Responses API** (`client.responses`), not Chat Completions. The course said Chat Completions returns empty content with gpt-5-nano. The model page lists Chat Completions as supported, and the likely cause was reasoning tokens using up the output limit. Responses is still the API OpenAI's guides lead with.

### Structured output with Zod

```typescript
// Inside generateStructured in lib/openai.ts only: the lint keeps openai/* inside lib.
const response = await getOpenAI().responses.parse({
  model,
  instructions,
  input,
  reasoning: { effort },
  text: { format: zodTextFormat(schema, schemaName), verbosity: "low" },
  max_output_tokens: maxOutputTokens,
  store: false,
  safety_identifier: sha256Hex(userId),
});
if (response.status === "incomplete")
  throw new AiOutputError(response.incomplete_details?.reason);
const parsed = response.output_parsed; // null on a refusal: treat as an error
```

`[changed: course: json_object with manual parsing, because zodResponseFormat "consumes excessive tokens". The SDK calls json_object an older method and recommends json_schema. Check zodTextFormat with one real call on the first day; if it fails, fall back to json_object]`

### Key differences from Chat Completions

| Chat Completions                        | Responses API                                     |
| --------------------------------------- | ------------------------------------------------- |
| `client.chat.completions.create()`      | `client.responses.create()` / `.parse()`          |
| `messages: [{ role, content }]`         | `instructions` (system) + `input` (user)          |
| `response_format: { ... }`              | `text: { format: { ... } }`                       |
| `completion.choices[0].message.content` | `response.output_text` / `response.output_parsed` |
| `max_tokens` / `max_completion_tokens`  | `max_output_tokens`                               |

### Other gotchas

- `max_output_tokens` includes reasoning tokens. When it runs out, `status` is `incomplete` with reason `max_output_tokens`, possibly with no visible output, and the input and reasoning are still billed. Always check `status`
- Do not send `temperature` or `top_p`: OpenAI says to remove them when reasoning effort is not `none`
- A strict schema fixes the shape `{ tags: string[] }`, so only one shape is parsed; the Zod check stays as the last guard `[changed: course: handle both an object and a bare array]`
- Always normalize tags to lowercase after receiving them
- The SDK retries some failures itself (`maxRetries: 1`), and may spend that retry on a spend-limit error; harmless. A failed call still uses up one count of the user's limit (plan §6)
- `openai` 7 needs Node 22 or later

## Notes

- `OPENAI_API_KEY` is read only in `lib/openai.ts`: no `NEXT_PUBLIC_` prefix, never `dangerouslyAllowBrowser` (plan §9)
- AI runs only on a click: never in the background or on save, so content does not leave without the user asking (plan §7)
- Output is untrusted: tags pass the strict schema and the normalizing, reach the form as text, and the user accepts each one (plan §9)
- See `docs/ai-integration-plan.md` for full architectural context
