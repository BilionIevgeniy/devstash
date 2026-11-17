import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Field } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const meta = {
  component: Field,
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    label: "Title",
    children: (id: string) => <Input id={id} placeholder="useDebounce hook" />,
  },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHint: Story = {
  args: { hint: "Shown in the list and in search results." },
};

// A control for the whole field sits at the end of the label row (the AI
// suggestion button of the tags field).
export const WithAction: Story = {
  args: {
    label: "Tags",
    action: (
      <Button variant="ghost" size="xs">
        Suggest
      </Button>
    ),
    children: (id: string) => <Input id={id} placeholder="react, hooks" />,
  },
};
