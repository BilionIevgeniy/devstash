import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PricingCard } from "@/features/billing/components/PricingCard";
import { PricingCardButton } from "@/features/billing/components/PricingCardButton";

// The pages word the plans from the messages (pricing-plan.ts); a story gives
// the card its finished props.
const meta = {
  component: PricingCard,
  decorators: [
    (Story) => (
      <div className="w-80 pt-4">
        <Story />
      </div>
    ),
  ],
  args: {
    name: "Free",
    price: "$0",
    note: "Free forever",
    features: ["50 items", "3 collections", "Basic search"],
    action: (
      <PricingCardButton variant="outline" disabled>
        Current plan
      </PricingCardButton>
    ),
  },
} satisfies Meta<typeof PricingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Free: Story = {};

// The highlighted card carries the "Most popular" badge over its edge.
export const Pro: Story = {
  args: {
    name: "Pro",
    price: "$8",
    note: "Billed monthly",
    features: [
      "Unlimited items and collections",
      "File and image uploads",
      "AI features",
      "Export (JSON)",
    ],
    highlighted: true,
    action: <PricingCardButton>Upgrade to Pro</PricingCardButton>,
  },
};
