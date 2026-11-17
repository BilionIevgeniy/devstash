import { parseTagInput } from "@/features/items/domain/item-fields";

// The AI-generated marks of an item (ADR 0027): a mark says "this value is an
// accepted AI output, unchanged since".

/** What a save claims: these values are AI outputs the user accepted as they are. */
export interface AiGeneratedClaims {
  description: boolean;
  content: boolean;
  tags: string[];
}

export const NO_AI_CLAIMS: AiGeneratedClaims = {
  description: false,
  content: false,
  tags: [],
};

export interface AiMarks {
  descriptionAiGenerated: boolean;
  contentAiGenerated: boolean;
  /** The item's tags that are accepted AI suggestions. */
  aiTags: string[];
}

/** The stored values and their marks before a save; null for a new item. */
export interface StoredAiFields extends AiMarks {
  description: string | null;
  content: string | null;
}

/**
 * The values a save stores, after its type dropped the fields it does not
 * have. A field left undefined is not changed.
 */
export interface SavedAiFields {
  description?: string | null;
  content?: string | null;
  tags: string[];
}

function fieldMark(
  previous: { value: string | null; marked: boolean } | null,
  next: string | null | undefined,
  claimed: boolean,
): boolean {
  const value = next === undefined ? (previous?.value ?? null) : next;
  if (value === null) return false;
  // A claim counts only on a value this save stores: claiming a field it
  // leaves out would mark the user's own text.
  if (claimed && next !== undefined) return true;
  return previous !== null && previous.marked && value === previous.value;
}

// A field is marked when the save claims it and stores a value, or when it was
// marked and keeps exactly the same value; any change makes it the user's. A
// tag is marked when claimed, or marked before and still on the item, both
// spelled exactly: tags are case-sensitive, so "Hooks" typed over the AI's
// "hooks" is the user's own tag.
export function nextAiMarks(
  previous: StoredAiFields | null,
  saved: SavedAiFields,
  claims: AiGeneratedClaims,
): AiMarks {
  const claimedTags = new Set(claims.tags);
  const markedTags = new Set(previous?.aiTags ?? []);
  return {
    descriptionAiGenerated: fieldMark(
      previous && {
        value: previous.description,
        marked: previous.descriptionAiGenerated,
      },
      saved.description,
      claims.description,
    ),
    contentAiGenerated: fieldMark(
      previous && {
        value: previous.content,
        marked: previous.contentAiGenerated,
      },
      saved.content,
      claims.content,
    ),
    aiTags: saved.tags.filter(
      (tag) => claimedTags.has(tag) || markedTags.has(tag),
    ),
  };
}

/** What a form accepted from the AI since it opened. */
export interface AcceptedAi {
  description: string | null;
  tags: string[];
}

export const NOTHING_ACCEPTED: AcceptedAi = { description: null, tags: [] };

// The browser's side: the description is claimed only while the field holds
// exactly the accepted summary, and the tags that were accepted and are still
// in the field with the same spelling (TagsField refuses a suggestion that
// differs only by case, so an accepted tag lands as suggested). A form never
// claims the content: an optimized prompt is saved by its own service.
export function acceptedAiClaims(
  values: { description: string; tags: string },
  accepted: AcceptedAi,
): AiGeneratedClaims {
  const acceptedTags = new Set(accepted.tags);
  return {
    description:
      accepted.description !== null &&
      values.description.trim() !== "" &&
      values.description.trim() === accepted.description.trim(),
    content: false,
    tags: parseTagInput(values.tags).filter((tag) => acceptedTags.has(tag)),
  };
}
