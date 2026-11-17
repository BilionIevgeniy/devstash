import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Input } from "@/components/ui/input";

// A field always has a label (the a11y check fails a nameless input); the
// forms of the app give it one through Field.
const meta = {
  component: Input,
  args: { id: "story-input", placeholder: "useDebounce hook" },
  render: (args) => (
    <div className="grid w-72 gap-1.5">
      <label htmlFor={args.id} className="text-sm font-medium">
        Title
      </label>
      <Input {...args} />
    </div>
  ),
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = { args: { defaultValue: "useDebounce hook" } };

export const Disabled: Story = { args: { disabled: true } };

export const Invalid: Story = { args: { "aria-invalid": true } };
