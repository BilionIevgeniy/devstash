# AI Explain Code

> Adapted to our architecture (paths: `context/architecture-rules.md`, "Old paths in specs"). The course wording is kept in `/Users/ievgenbilion/Programming/Projects/Devstash/featuresDRAFT.original/`. Changed requirements are marked `[changed: ...]`.

## Overview

Add AI-powered code explanation for snippets and commands in the item drawer using the OpenAI `gpt-6-luna` model `[changed: course: "gpt-5-nano", which leaves the API on 2026-12-11]`. These are the two item types where explanation adds value — actual code and terminal commands. Other types (prompts, notes, links, files, images) are already human-readable or non-code. Pro-only feature. Explanation displays inline via a tab interface in the code editor, not as a separate panel.

## Requirements

- Create a streaming route `app/api/ai/explain/route.ts` with auth, Zod validation (`ai/schemas.ts`), then one call into `ai/services/explain.ts`, which does the Pro check (`getEntitlements`) and the rate limit before the stream opens, then streams the OpenAI answer as plain text `[changed: course: an explainCode server action. Server Actions run one at a time, so a slow AI call would hold up the user's other actions; see section 5 of docs/ai-integration-plan.md]`
- The route answers 401, 400, 403 (not Pro) and 429 (limit) as JSON before streaming, sets `Cache-Control: private, no-store` and `maxDuration = 60`, and passes `request.signal` to OpenAI so closing the drawer stops generation
- Reuse the OpenAI foundation from auto-tagging (`lib/openai.ts`, `AI_MODEL`, the shared hourly and daily limits); add `streamText` to `lib/openai.ts` if it is missing. Use `reasoning: { effort: "low" }`, `store: false`, `safety_identifier`, `max_output_tokens: 2000` to start
- Truncate the code to 8,000 characters before the call, and say so in the UI when it was cut
- Add "Explain" button (Sparkles icon) to code editor window controls header (next to Copy button). `editor` cannot import `ai`, so `CodeEditor` gets two optional props, `headerActions` and `view`, which `items/_internal/components/ItemBody.tsx` fills with `ExplainButton` and the explanation from `ai` `[changed: not in the course; rank order]`
- Only show for snippet and command types in the item drawer (not in create/edit forms)
- After generating, show Code/Explain tabs in the editor header to toggle between views
- Render explanation as markdown in the same container space as the code editor. `MarkdownPreview` moves from `editor/_internal/` to `editor/components/` and gets a mode that drops images for AI output, so injected text cannot load an image URL that carries data out `[changed: not in the course; see section 9 of the plan]`
- Explanation should be concise (~200-300 words) covering what the code does and key concepts
- Loading state: Loader2 spinner until the first words arrive, then the text grows in place in a box that scrolls at the editor's maximum height `[changed: course: a spinner until the whole answer]`
- Pro gating in UI: show Crown icon + tooltip ("AI features require Pro subscription") for free users
- Error handling via toast (Pro gating, rate limit, AI service errors). An error before any text returns to the Code tab; an error mid-stream keeps the text with a note that it was cut short; an abort shows nothing
- Follow existing patterns
- Unit tests for `ai/domain/explain.ts` (prompt, truncation) and for the service with `@/lib/openai`, `@/lib/rate-limit` and `getEntitlements` mocked: Free and limited users are refused before any OpenAI call `[changed: testing standard, course: unit tests for the server action]`

## Notes

- Explanations are not saved to the database — regenerated on each click. The last one stays in component state, so switching tabs does not call again
- Not available in create/edit forms, only in the item drawer read view
- The drawer gets the plan as `canUseAi` in the `ok` result of `openUserItem` (`items/services/item-detail.ts`), with the detail it already loads; auto-tagging builds this first. The full item page (`getUserItemDetailOfType`) still needs it here `[changed: course: isPro as a prop to the item drawer and code editor, which no layout passes today]`
- See `docs/ai-integration-plan.md` for full architectural context
