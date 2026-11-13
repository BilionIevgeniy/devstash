import { z } from "zod";

import { AI_INPUT_MAX } from "@/features/ai/domain/input";

const aiText = z.string().max(AI_INPUT_MAX, "aiInputTooLong");

// What every AI operation on an item takes: the form's text as it is now,
// saved or not.
export const aiItemInputSchema = z
  .object({ title: aiText, content: aiText })
  .refine(
    ({ title, content }) => title.trim() !== "" || content.trim() !== "",
    "nothingToRead",
  );

export type AiItemInput = z.infer<typeof aiItemInputSchema>;

// The shape the model must answer in. No bounds on the list: a strict schema
// may not enforce them, and a sixth tag is not worth a failed call;
// normalizeTags keeps the count.
export const tagSuggestionsSchema = z.object({ tags: z.array(z.string()) });

// No length bound either, for the same reason: normalizeSummary keeps it.
export const summarySchema = z.object({ summary: z.string() });

// Items' LANGUAGE_MAX, which this feature cannot import.
const LANGUAGE_MAX = 50;

// What Explain Code takes: the code as shown, its language when it has one.
export const explainInputSchema = z.object({
  title: aiText,
  language: z.string().max(LANGUAGE_MAX).nullable(),
  code: aiText.refine((code) => code.trim() !== "", "nothingToExplain"),
});

export type ExplainInput = z.infer<typeof explainInputSchema>;

// What prompt optimization takes: the saved prompt as shown.
export const optimizePromptInputSchema = z.object({
  title: aiText,
  prompt: aiText.refine((prompt) => prompt.trim() !== "", "nothingToOptimize"),
});

export type OptimizePromptInput = z.infer<typeof optimizePromptInputSchema>;
