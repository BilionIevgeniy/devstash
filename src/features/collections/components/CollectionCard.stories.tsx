import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, userEvent, waitFor, within } from "storybook/test";

import { setCollectionFavorite } from "@/features/collections/actions/collection";
import { CollectionCard } from "@/features/collections/components/CollectionCard";
import type { DashboardCollection } from "@/features/collections/types";
import { fail, ok } from "@/lib/action-result";

// The action is the mock of actions/__mocks__/collection.ts (sb.mock in
// .storybook/preview.tsx).
const COLLECTION: DashboardCollection = {
  id: "collection-react",
  name: "React patterns",
  description: "Hooks, context and composition recipes.",
  isFavorite: false,
  itemCount: 12,
  types: [
    { id: "type-snippet", name: "snippet", icon: "Code", color: "#3b82f6" },
    { id: "type-note", name: "note", icon: "StickyNote", color: "#fde047" },
    { id: "type-link", name: "link", icon: "Link", color: "#10b981" },
  ],
};

const meta = {
  component: CollectionCard,
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: { collection: COLLECTION },
  beforeEach: () => {
    mocked(setCollectionFavorite).mockResolvedValue(ok());
  },
} satisfies Meta<typeof CollectionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Favorite: Story = {
  args: { collection: { ...COLLECTION, isFavorite: true } },
};

export const Empty: Story = {
  args: {
    collection: {
      ...COLLECTION,
      name: "Inbox",
      description: null,
      itemCount: 0,
      types: [],
    },
  },
};

// The star sends the value it wants, so two tabs cannot flip it back and
// forth.
export const StarIt: Story = {
  play: async ({ canvasElement }) => {
    const star = within(canvasElement).getByRole("button", {
      name: "Favorite React patterns",
    });
    await userEvent.click(star);
    await expect(setCollectionFavorite).toHaveBeenCalledWith(
      COLLECTION.id,
      true,
    );
  },
};

// A refused save: the star falls back and the error is said in words.
export const StarFails: Story = {
  beforeEach: () => {
    mocked(setCollectionFavorite).mockResolvedValue(fail("favoriteFailed"));
  },
  play: async ({ canvasElement }) => {
    const star = within(canvasElement).getByRole("button", {
      name: "Favorite React patterns",
    });
    await userEvent.click(star);
    // The toast portals into <body> and slides in. The axe check scans what
    // is on screen when `play` ends, so the toast must have settled first: a
    // half-faded toast fails the contrast check by timing.
    const message = await within(canvasElement.ownerDocument.body).findByText(
      "Couldn't update the favorite.",
    );
    const toastElement = message.closest("[data-sonner-toast]");
    await waitFor(() =>
      expect(toastElement).toHaveAttribute("data-mounted", "true"),
    );
    await waitFor(() => expect(toastElement?.getAnimations()).toHaveLength(0));
    await waitFor(() => expect(star).toHaveAttribute("aria-pressed", "false"));
  },
};
