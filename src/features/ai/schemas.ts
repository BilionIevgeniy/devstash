import { z } from "zod";

import { AI_INPUT_MAX } from "@/features/ai/domain/input";

const NOTHING_TO_READ_MESSAGE = "Add a title or content first";

const aiText = z.string().max(AI_INPUT_MAX, `Up to ${AI_INPUT_MAX} characters`);

// What every AI operation on an item takes: the form's text as it is now,
// saved or not.
export const aiItemInputSchema = z
  .object({ title: aiText, content: aiText })
  .refine(
    ({ title, content }) => title.trim() !== "" || content.trim() !== "",
    NOTHING_TO_READ_MESSAGE,
  );

export type AiItemInput = z.infer<typeof aiItemInputSchema>;

// The shape the model must answer in. No bounds on the list: a strict schema
// may not enforce them, and a sixth tag is not worth a failed call;
// normalizeTags keeps the count.
export const tagSuggestionsSchema = z.object({ tags: z.array(z.string()) });

// No length bound either, for the same reason: normalizeSummary keeps it.
export const summarySchema = z.object({ summary: z.string() });
