import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { Command, CommandInput, CommandList } from "@/components/ui/command";
import type { PaletteSearch } from "@/features/search/_internal/components/hooks/use-palette-search";
import { PaletteBody } from "@/features/search/_internal/components/PaletteBody";
import type { PaletteResults } from "@/features/search/types";

// The states of the command palette's list. PaletteResults reads them from
// usePaletteSearch, which fetches; PaletteBody takes the same state as its
// `search` prop, so each state is plain args (ADR 0026). Wrapped as
// PaletteResults wraps it.
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

// Known violations, left in the component on purpose: fixing them changes what
// the user sees (fixed in feature 20, context/features/plan/20.ux-a11y-and-consent.md). Each story turns off only
// these rules, and only where it breaks them; every other check stays on.
// - aria-required-children: the loading skeleton, the empty and the failure
//   messages and the dimmed previous results sit inside cmdk's listbox, which
//   may own options and groups only.
// - color-contrast: the previous results are dimmed (opacity-50) while the
//   next answer is pending, which takes their headings under 4.5:1.
const REQUIRED_CHILDREN = { id: "aria-required-children", enabled: false };
const CONTRAST = { id: "color-contrast", enabled: false };
const NOT_IN_LISTBOX = {
  a11y: { config: { rules: [REQUIRED_CHILDREN] } },
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
        <CommandList className="h-72">
          <Story />
        </CommandList>
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
  parameters: NOT_IN_LISTBOX,
};

// The next answer is pending: the last results stay, dimmed and not selectable.
export const PendingWithPrevious: Story = {
  args: { search: { ...SETTLED, isPending: true, previous: RESULTS } },
  parameters: {
    a11y: { config: { rules: [REQUIRED_CHILDREN, CONTRAST] } },
  },
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
  parameters: NOT_IN_LISTBOX,
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
  parameters: NOT_IN_LISTBOX,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toBeVisible();
    await userEvent.click(canvas.getByRole("option", { name: "Try again" }));
    await expect(args.search.retry).toHaveBeenCalled();
  },
};

export const RateLimited: Story = {
  args: { search: { ...SETTLED, outcome: { status: "rate-limited" } } },
  parameters: NOT_IN_LISTBOX,
};
