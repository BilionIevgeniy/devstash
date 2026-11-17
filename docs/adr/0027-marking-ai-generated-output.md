# 0027. AI output is marked per field, in the data and in the markup

- Status: accepted
- Date: 2026-11-17
- Amends: [0014](0014-launch-mode.md) (the open Art. 50 (2) item), [0019](0019-export-without-file-bytes.md) and [0020](0020-import-as-batched-data-input.md) (one more field in the export format). Those records stay as they are; this one says what changed.

Facts about the law and the Code of Practice below are **as of 2026-11-17**, each with its source. This is engineering documentation, not legal advice; the lawyer's check of this decision is in `context/todo-before-live.md`.

## Context

ADR 0014 left Art. 50 (2) of the AI Act open: the provider of an AI system that generates text marks the output "in a machine-readable format and detectable as artificially generated", "as far as technically feasible, taking into account the specificities and limitations of various types of content". DevStash is that provider for its four AI functions (0014, "Role"). The functions existed before 2 August 2026, so the obligation applies from **2 December 2026**.

What the AI writes, and where it ends up:

| Function                                  | Output                                                                  | Saved?                                   |
| ----------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------- |
| Auto-tagging (`AiTagSuggestions`)         | tag names the user accepts one by one into the form                     | as tags, with the form's Save            |
| Summary (`AiDescriptionSummary`)          | one line of at most 500 characters, accepted into the description field | as the description, with the form's Save |
| Prompt optimization (`AiPromptOptimizer`) | a rewritten prompt, accepted with "Use this prompt"                     | as the content, at once                  |
| Explain Code (`AiCodeExplanation`)        | a Markdown explanation                                                  | never; shown and gone                    |

The exception for "assistive functions for standard editing" is doubtful for generated summaries, explanations and rewritten prompts; for tags it is arguable. Deciding per function would make the rule depend on facts nobody has confirmed. The owner decided without a lawyer: **every AI output is marked**, so there is one rule.

### The Code of Practice

The Commission published the final Code of Practice on Transparency of AI-generated Content on 10 June 2026 and concluded on 8 July 2026 that it adequately covers Art. 50 (2), (4) and (5); the AI Board's adequacy assessment followed the next day. Adherence is voluntary and "does not constitute conclusive evidence of compliance". DevStash has not signed it; it follows Section 1 where it fits. What Section 1 says that matters here (read from the published PDF):

- **Measure 1.1**: at least two machine-readable layers (signed metadata, Sub-measure 1.1.1, and an imperceptible watermark, 1.1.2) for audio, images, video and "containerised text". For free-form text, which "cannot transport metadata", the watermark alone is "considered sufficient".
- **Sub-measure 1.1.2**: the watermark is not required for "very short text"; free-form text "longer than 200 tokens" still gets one. Marking "may be implemented at different stages of the value chain (e.g. … by an upstream model provider)".
- **Sub-measure 1.1.1**: content "exported in a data format that supports attaching metadata" records whether it is AI-generated, digitally signed and time-stamped.
- **Sub-measure 1.1.3**: logging is an optional supplement and not enough alone.
- **Measure 2.1**: a detection solution, which may be "a public, ideally standardised, specification allowing any third party to implement a detection mechanism"; where only a limited number of people see the content, access "may be restricted to those natural persons" (2.1.2).
- **Paragraph g**: "simplified ways of compliance for SMEs … should be possible, in a proportionate manner".

Sources: [Code of Practice page](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content), [Commission opinion of 8 July 2026](https://digital-strategy.ec.europa.eu/en/library/commission-opinion-assessment-code-practice-transparency-ai-generated-content), [FAQ](https://digital-strategy.ec.europa.eu/en/faqs/code-practice-transparency-ai-generated-content), [Regulation (EU) 2024/1689, Art. 50](https://eur-lex.europa.eu/eli/reg/2024/1689/oj).

## Options

1. **A visible label only.** Does not meet Art. 50 (2), which asks for a machine-readable mark.
2. **A watermark in the text.** OpenAI's API does not watermark text, so it would have to be post-hoc: zero-width characters or chosen whitespace. DevStash stores code, shell commands and prompts; an invisible character in them breaks the code or changes what a prompt says, and it is gone with the first copy through a plain-text filter. Not technically feasible for this content.
3. **A stored flag per field, carried wherever the field goes.** The database knows which value came from the AI; the HTML and the export carry that knowledge in a documented form.

## Decision

Option 3.

### What is marked

- `Item.descriptionAiGenerated`: the description is an accepted summary.
- `Item.contentAiGenerated`: the content is an accepted optimized prompt.
- `ItemTag.aiGenerated`: this tag was an accepted suggestion on this item. The flag is on the link, not on `Tag`: one tag name can be the AI's on one item and the user's on another.
- The Explain answer and the previews before Accept (the summary, the tag badges, the optimized prompt) are never saved, so they are marked only in the markup.

One boolean per field rather than a list column: typed, no set of names to keep in step with the code, and a new AI field is one more column.

### What an edit does

A flag says "this value is the AI's text, unchanged". The rule is `nextAiMarks` in `src/features/items/domain/ai-marks.ts`:

- A field is marked when the save claims it and the value is stored (a claim on a field the item's type does not have marks nothing), or when it was marked and the value is exactly the same as before.
- Any change of the value clears the flag: the text is then the user's. A field the save leaves out keeps its flag.
- A tag is marked when the save claims it, or when it was marked and is still on the item. Removing it removes the link and its flag.
- Accepting an optimized prompt sets the content flag on the server (`setUserItemAiContent`); no claim is needed, since that service has no other caller.

The browser makes the claim: the create and edit forms remember what was accepted (`useAcceptedAi`), and `acceptedAiClaims` claims the description only when the field still holds exactly the accepted summary (trimmed), and the tags that are accepted suggestions still in the list. **The claim is trusted.** It can mark only the caller's own items, and a client that lies could just as well retype the text unmarked; nobody gains from it. The future public API takes the same `aiGenerated` input with the same trust.

### The machine-readable layers

1. **The data.** The flags are stored with the values they describe, in the same `UPDATE`, so concurrent saves keep them consistent: the flag always belongs to the value that won.
2. **The markup.** Every element that shows a marked value carries `data-ai-generated="true"` (`aiMarkProps` in `src/features/ai/domain/marking.ts`): the description, content and tag badges in the drawer and on the item page, the description and tag badges of the cards and rows, the preview line of the command palette when it comes from marked content, and the unsaved outputs (the Explain answer, the optimized prompt, the summary preview, the tag suggestions).
3. **The export.** Each item in the JSON export has `"aiGenerated": { "description": boolean, "content": boolean, "tags": string[] }`. The import reads it back (see "Export format" below).

A visible "AI-generated" label stands next to a marked field in the drawer and on the item page, and as a decorative icon on the cards and rows (`aria-hidden`: the card's accessible name stays short, and the attribute carries the meaning). The label is for the reader; the layers above are what Art. 50 (2) asks for.

### Where DevStash departs from the Code of Practice

- **No watermark** on the optimized prompt or the Explain answer, which can exceed 200 tokens. Option 2 explains why it is not technically feasible for code and prompts; Art. 50 (2) asks for marking only as far as it is. Tags and the 500-character summary are "very short text" (Sub-measure 1.1.2) in any case. If OpenAI marks its text output at the model level one day, that is the upstream marking the Code allows for, and this record is revisited.
- **The export's metadata is not signed** (Sub-measure 1.1.1). Signing needs a key held in production and a published public key to verify against, for an export only the owner downloads. Paragraph g allows SMEs a simplified way; whether the lawyer sees it so is part of the check in `context/todo-before-live.md`.
- **Detection** (Measure 2.1) is this record and the attribute and export field it specifies: a public specification any third party can implement. Items are private to their owner, so the people who see the content are the people who hold the export (2.1.2).

### Export format

The field is added to format version 1 and the version stays 1. The import maps `aiGenerated` defensively in `toCreateItemCandidate`: a missing or malformed field imports as not marked, so every file exported before this change imports as it did. A deployment older than this change ignores the field on import (it reads only the fields it knows), so a new file loses its marks there and nothing else. A version bump would make that older importer refuse the whole file, for one optional field.

## Consequences

- The migration only adds columns with a default of `false`: the live deployment neither reads nor writes them (expand only). Items saved before this change are unmarked; nothing was marked then.
- **Rollback window.** If a deployment older than this change runs against the migrated database (a rollback, or the minutes between the migration and the new build serving), its edits break the rule both ways: its `updateUserItem` changes a description without clearing `descriptionAiGenerated` (a stale mark), and it recreates every `ItemTag` of the item without the flag (lost tag marks). Accepted: the window is short and the flags only describe the user's own data.
- The comparison "unchanged" is exact. An editor that rewrote a value without an edit (line endings, trailing whitespace) would clear a flag on an unrelated save; the content comes from the model with `\n` line endings, and a test pins the rule.
- Every place that copies a saved item into a list row or the drawer uses `savedRowFields` (`items/domain/item-detail.ts`), so the flags cannot be left behind after a save.
- A new AI function that saves a field adds a column, a case in `nextAiMarks`, the field in `aiGenerated` of the export and the attribute where the field is shown, and amends this record.
