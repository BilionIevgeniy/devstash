import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

const meta = {
  component: Button,
  args: { children: "Save" },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "outline",
        "secondary",
        "ghost",
        "destructive",
        "link",
      ],
    },
    size: {
      control: "select",
      options: ["default", "xs", "sm", "lg"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-2">
      <Button {...args}>Default</Button>
      <Button {...args} variant="outline">
        Outline
      </Button>
      <Button {...args} variant="secondary">
        Secondary
      </Button>
      <Button {...args} variant="ghost">
        Ghost
      </Button>
      <Button {...args} variant="destructive">
        Delete
      </Button>
      <Button {...args} variant="link">
        Link
      </Button>
    </div>
  ),
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Plus data-icon="inline-start" aria-hidden />
        New item
      </>
    ),
  },
};

// An icon-only button gets its name from aria-label, which the a11y check
// requires.
export const IconOnly: Story = {
  args: {
    size: "icon",
    "aria-label": "New item",
    children: <Plus aria-hidden />,
  },
};

export const Disabled: Story = {
  args: { disabled: true, children: "Saving…" },
};
