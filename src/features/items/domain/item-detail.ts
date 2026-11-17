import type {
  DashboardItem,
  ItemDetail,
  ItemDetailJson,
} from "@/features/items/types";

export type SavedRowFields = Pick<
  DashboardItem,
  "title" | "description" | "descriptionAiGenerated" | "tags" | "aiTags"
>;

// What a row, a card or the drawer's header takes from a saved detail: every
// field an edit can change, the AI marks included (ADR 0027). The one place
// that list lives, so a new editable field cannot be left behind in one copy.
export function savedRowFields({
  title,
  description,
  descriptionAiGenerated,
  tags,
  aiTags,
}: SavedRowFields): SavedRowFields {
  return { title, description, descriptionAiGenerated, tags, aiTags };
}

// The dates go out as ISO strings, the shape GET /api/items/[id] answers with,
// so the drawer keeps one type for its detail.
export function toItemDetailJson({
  createdAt,
  updatedAt,
  ...item
}: ItemDetail): ItemDetailJson {
  return {
    ...item,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}
