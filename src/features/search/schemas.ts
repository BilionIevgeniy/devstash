import { z } from "zod";

import {
  SEARCH_OFFSET_MAX,
  SEARCH_TEXT_MAX,
} from "@/features/search/domain/limits";

// The query of GET /api/search. No q (or only spaces) asks for the recent
// list; cursor is the offset of the next page, as the last answer gave it.
export const searchParamsSchema = z.object({
  q: z.string().trim().max(SEARCH_TEXT_MAX).default(""),
  cursor: z.coerce.number().int().min(0).max(SEARCH_OFFSET_MAX).default(0),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

export function parseSearchParams(searchParams: URLSearchParams) {
  return searchParamsSchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  });
}
