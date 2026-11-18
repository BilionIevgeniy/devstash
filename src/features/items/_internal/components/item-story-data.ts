import type { ItemCardData } from "@/features/items/types";

// Demo items for the stories of ItemCard and ItemRow, with the icons and
// colours of the system types (prisma/seed-data.ts). A fixed date, so the
// formatted text is the same in every run.
const CREATED_AT = new Date("2026-11-02T09:30:00Z");

export const SNIPPET_ITEM: ItemCardData = {
  id: "item-snippet",
  title: "useDebounce hook",
  description: "Delays a value until the user stops typing.",
  isFavorite: false,
  isPinned: false,
  descriptionAiGenerated: false,
  aiTags: [],
  createdAt: CREATED_AT,
  tags: ["react", "hooks"],
  type: {
    id: "type-snippet",
    name: "snippet",
    slug: "snippets",
    icon: "Code",
    color: "#3b82f6",
  },
  canCopy: true,
};

export const PINNED_COMMAND_ITEM: ItemCardData = {
  ...SNIPPET_ITEM,
  id: "item-command",
  title: "Reset a branch to its remote",
  description: "git fetch origin && git reset --hard origin/main",
  isPinned: true,
  tags: ["git"],
  type: {
    id: "type-command",
    name: "command",
    slug: "commands",
    icon: "Terminal",
    color: "#f97316",
  },
};

export const LONG_TITLE_ITEM: ItemCardData = {
  ...SNIPPET_ITEM,
  id: "item-long",
  title:
    "A prompt with a very long title that does not fit on one line of the card or the row",
  description: null,
  tags: [],
  type: {
    id: "type-prompt",
    name: "prompt",
    slug: "prompts",
    icon: "Sparkles",
    color: "#8b5cf6",
  },
  canCopy: false,
};

// An accepted summary and two accepted suggestions (ADR 0027): the icons
// stand by the description and the AI tags, and "mine" stays unmarked.
export const AI_MARKED_ITEM: ItemCardData = {
  ...SNIPPET_ITEM,
  id: "item-ai",
  description:
    "A hook that waits until the value has stopped changing for the given delay, then returns it.",
  descriptionAiGenerated: true,
  tags: ["hooks", "mine", "react"],
  aiTags: ["hooks", "react"],
};
