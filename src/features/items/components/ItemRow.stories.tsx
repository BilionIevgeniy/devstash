import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  LONG_TITLE_ITEM,
  PINNED_COMMAND_ITEM,
  SNIPPET_ITEM,
} from "@/features/items/_internal/components/item-story-data";
import { ItemRow } from "@/features/items/components/ItemRow";

const meta = {
  component: ItemRow,
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
  args: { item: SNIPPET_ITEM },
} satisfies Meta<typeof ItemRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Pinned: Story = { args: { item: PINNED_COMMAND_ITEM } };

// No description, no tags, nothing to copy: the title truncates.
export const LongTitle: Story = { args: { item: LONG_TITLE_ITEM } };
