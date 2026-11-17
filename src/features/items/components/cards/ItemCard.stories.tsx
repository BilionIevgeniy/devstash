import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import {
  AI_MARKED_ITEM,
  LONG_TITLE_ITEM,
  PINNED_COMMAND_ITEM,
  SNIPPET_ITEM,
} from "@/features/items/_internal/components/item-story-data";
import { ItemCard } from "@/features/items/components/cards/ItemCard";

const meta = {
  component: ItemCard,
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: { item: SNIPPET_ITEM },
} satisfies Meta<typeof ItemCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Pinned: Story = { args: { item: PINNED_COMMAND_ITEM } };

// No description, no tags, nothing to copy: the title truncates.
export const LongTitle: Story = { args: { item: LONG_TITLE_ITEM } };

// ADR 0027: the description and the AI tags carry the attribute; the icons
// are decorative, so the text a screen reader gets stays the same.
export const AiMarked: Story = {
  args: { item: AI_MARKED_ITEM },
  play: async ({ canvasElement }) => {
    const marked = canvasElement.querySelectorAll("[data-ai-generated]");
    await expect([...marked].map((element) => element.textContent)).toEqual([
      AI_MARKED_ITEM.description,
      "hooks",
      "react",
    ]);
  },
};
