import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { Command, CommandInput } from "@/components/ui/command";
import type { PaletteSearch } from "@/features/search/_internal/components/hooks/use-palette-search";
import { PaletteBody } from "@/features/search/_internal/components/PaletteBody";
import type { PaletteResults } from "@/features/search/types";

// The states of the command palette's list. PaletteResults reads them from
// usePaletteSearch, which fetches; PaletteBody takes the same state as its
// `search` prop, so each state is plain args (ADR 0026). Wrapped in the
// Command and input of PaletteResults.
const RESULTS: PaletteResults = {
  items: [
    {
      id: "item-debounce",
      title: "useDebounce hook",
      description: "Delays a value until the user stops typing.",
      preview: "export function useDebounce<T>(value: T, delay = 250) {",
      isFavorite: false,
      isPinned: false,
      createdAt: new Date("2026-11-02T09:30:00Z"),
      tags: ["react", "hooks"],
      type: {
        id: "type-snippet",
        name: "snippet",
        icon: "Code",
        color: "#3b82f6",
      },
      isLocked: false,
    },
    {
      id: "item-upload",
      title: "Upload a release asset",
      description: null,
      preview: null,
      isFavorite: false,
      isPinned: false,
      createdAt: new Date("2026-10-28T14:00:00Z"),
      tags: [],
      type: { id: "type-file", name: "file", icon: "File", color: "#6b7280" },
      isLocked: true,
    },
  ],
  collections: [
    { id: "collection-react", name: "React patterns", itemCount: 12 },
  ],
  nextCursor: null,
};

const SETTLED: PaletteSearch = {
  outcome: { status: "ready", results: RESULTS },
  previous: null,
  isPending: false,
  isLoadingMore: false,
  loadMoreFailed: false,
  loadMore: fn(),
  retry: fn(),
};

const meta = {
  component: PaletteBody,
  decorators: [
    (Story) => (
      <Command
        label="Search"
        shouldFilter={false}
        className="max-w-lg rounded-lg border"
      >
        <CommandInput value="react" readOnly />
        <Story />
      </Command>
    ),
  ],
  args: {
    search: SETTLED,
    onSelectItem: fn(),
    onSelectCollection: fn(),
  },
} satisfies Meta<typeof PaletteBody>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Results: Story = {};

// The skeleton of the first answer.
export const Loading: Story = {
  args: { search: { ...SETTLED, outcome: null, isPending: true } },
};

// The next answer is pending: the last results stay, their options dimmed and
// not selectable; the group headings keep their contrast.
export const PendingWithPrevious: Story = {
  args: { search: { ...SETTLED, isPending: true, previous: RESULTS } },
};

export const Empty: Story = {
  args: {
    search: {
      ...SETTLED,
      outcome: {
        status: "ready",
        results: { items: [], collections: [], nextCursor: null },
      },
    },
  },
};

export const MorePages: Story = {
  args: {
    search: {
      ...SETTLED,
      outcome: { status: "ready", results: { ...RESULTS, nextCursor: "next" } },
    },
  },
};

// A failure in plain words, with a way to try again from the keyboard.
export const Failed: Story = {
  args: { search: { ...SETTLED, outcome: { status: "error" } } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toBeVisible();
    await userEvent.click(canvas.getByRole("option", { name: "Try again" }));
    await expect(args.search.retry).toHaveBeenCalled();
  },
};

export const RateLimited: Story = {
  args: { search: { ...SETTLED, outcome: { status: "rate-limited" } } },
};
