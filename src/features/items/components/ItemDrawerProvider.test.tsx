import { act, render, screen, waitFor } from "../../../../test/intl";
import userEvent from "@testing-library/user-event";
import { useEffect, type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ItemDrawerContent } from "@/features/items/_internal/components/ItemDrawerContent";
import type { DashboardItem, OpenedItemJson } from "@/features/items/types";
import { fail } from "@/lib/action-result";
import { RouteError } from "@/lib/route-error";

const fetchItemDetail = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
// The query the hook builds, around the mocked fetch: the same key and the
// same staleTime (ITEM_DETAIL_STALE_MS) as the real one.
vi.mock("@/features/items/_internal/components/fetch-item-detail", () => ({
  fetchItemDetail,
  itemDetailQuery: (id: string) => ({
    queryKey: ["items", "detail", id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      fetchItemDetail(id, signal),
    staleTime: 60 * 1000,
  }),
}));
vi.mock("@/features/items/actions/item", () => ({
  deleteItem: vi.fn(),
  setItemFavorite: vi.fn(),
  setItemPin: vi.fn(),
}));
// The real content pulls in the editors. The probe shows what the provider
// hands it: the state it got, and a way to report unsaved edits.
vi.mock("@/features/items/_internal/components/ItemDrawerContent", async () => {
  const { SheetTitle } = await import("@/components/ui/sheet");
  return {
    ITEM_SHEET_CLASS: "",
    ItemDrawerContent: ({
      item,
      state,
      onDirtyChange,
    }: ComponentProps<typeof ItemDrawerContent>) => (
      <>
        <SheetTitle>{item.title}</SheetTitle>
        <p role="status">
          {state.status === "ready"
            ? `ready: ${state.detail.title}`
            : state.status}
        </p>
        <button type="button" onClick={() => onDirtyChange?.(true)}>
          Edit something
        </button>
      </>
    ),
  };
});

import { ItemDrawerProvider } from "@/features/items/components/ItemDrawerProvider";
import { useItemDrawer } from "@/features/items/components/hooks/use-item-drawer";

type Drawer = ReturnType<typeof useItemDrawer>;
type Answer = PromiseWithResolvers<OpenedItemJson>;

function cardItem(id: string, title: string): DashboardItem {
  return {
    id,
    title,
    description: null,
    isFavorite: false,
    isPinned: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    tags: [],
    type: { id: "type-snippet", name: "Snippet", icon: "Code" },
  };
}

function openedFor(card: DashboardItem): OpenedItemJson {
  return {
    item: {
      ...card,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      contentType: "text",
      content: "ls -la",
      url: null,
      language: null,
      collections: [],
      file: null,
    },
    canUseAi: false,
  };
}

const ALPHA = cardItem("item-a", "Alpha");
const BETA = cardItem("item-b", "Beta");

// Each call of the fetch gets the next answer, so a test decides which one
// arrives when.
function queueAnswers(count: number): Answer[] {
  const answers = Array.from({ length: count }, () =>
    Promise.withResolvers<OpenedItemJson>(),
  );
  for (const answer of answers) {
    fetchItemDetail.mockReturnValueOnce(answer.promise);
  }
  return answers;
}

function signalOfCall(call: number): AbortSignal {
  return fetchItemDetail.mock.calls[call][1];
}

function Capture({ onDrawer }: { onDrawer: (drawer: Drawer) => void }) {
  const drawer = useItemDrawer();
  useEffect(() => {
    onDrawer(drawer);
  });
  return null;
}

// The sheet is modal, so a second card cannot be clicked while it is open;
// the test calls `open` of the context, as a card's trigger would.
function setup() {
  const onDrawer = vi.fn();
  render(
    <ItemDrawerProvider>
      <Capture onDrawer={onDrawer} />
    </ItemDrawerProvider>,
  );
  function open(card: DashboardItem) {
    const call = onDrawer.mock.lastCall;
    if (!call) throw new Error("The provider did not render.");
    return act(async () => call[0].open(card));
  }
  return { open, user: userEvent.setup() };
}

describe("ItemDrawerProvider", () => {
  it("shows the card's item at once, then the fetched detail", async () => {
    const [answer] = queueAnswers(1);
    const { open } = setup();

    await open(ALPHA);

    expect(screen.getByRole("dialog", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("loading");
    expect(fetchItemDetail).toHaveBeenCalledExactlyOnceWith(
      "item-a",
      expect.any(AbortSignal),
    );

    await act(async () => answer.resolve(openedFor(ALPHA)));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("ready: Alpha");
    });
  });

  it("fetches an item opened twice within a minute once", async () => {
    const [answer] = queueAnswers(1);
    const { open, user } = setup();
    await open(ALPHA);
    await act(async () => answer.resolve(openedFor(ALPHA)));
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    await open(ALPHA);

    expect(screen.getByRole("status")).toHaveTextContent("ready: Alpha");
    expect(fetchItemDetail).toHaveBeenCalledOnce();
  });

  it("shows the error state for a refused detail, and does not ask again", async () => {
    const [answer] = queueAnswers(1);
    const { open } = setup();
    await open(ALPHA);

    await act(async () =>
      answer.reject(new RouteError(404, fail("itemNotFound"))),
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("error");
    });
    expect(fetchItemDetail).toHaveBeenCalledOnce();
  });

  it("asks once more when the request fails, then shows the error", async () => {
    const [first, second] = queueAnswers(2);
    const { open } = setup();
    await open(ALPHA);

    await act(async () => first.reject(new TypeError("Failed to fetch")));
    await waitFor(() => expect(fetchItemDetail).toHaveBeenCalledTimes(2), {
      timeout: 3000,
    });
    expect(screen.getByRole("status")).toHaveTextContent("loading");
    await act(async () => second.reject(new TypeError("Failed to fetch")));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("error");
    });
  });

  it("cancels the older request when another item is opened", async () => {
    const [alpha, beta] = queueAnswers(2);
    const { open } = setup();
    await open(ALPHA);
    await open(BETA);
    expect(signalOfCall(0).aborted).toBe(true);
    expect(signalOfCall(1).aborted).toBe(false);
    expect(screen.getByRole("dialog", { name: "Beta" })).toBeInTheDocument();

    await act(async () => alpha.resolve(openedFor(ALPHA)));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("loading");
    });

    await act(async () => beta.resolve(openedFor(BETA)));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("ready: Beta");
    });
  });

  it("does not take the cancelled request for a failure", async () => {
    const [alpha, beta] = queueAnswers(2);
    const { open } = setup();
    await open(ALPHA);
    await open(BETA);

    await act(async () => alpha.reject(new DOMException("", "AbortError")));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("loading");
    });

    await act(async () => beta.resolve(openedFor(BETA)));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("ready: Beta");
    });
  });

  // A detail that arrives after the close is kept under its own id: the next
  // open of the same item shows it with no request.
  it("lets the request finish when the sheet is closed, and reuses it", async () => {
    const [answer] = queueAnswers(1);
    const { open, user } = setup();
    await open(ALPHA);

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(signalOfCall(0).aborted).toBe(false);
    await act(async () => answer.resolve(openedFor(ALPHA)));

    await open(ALPHA);
    expect(screen.getByRole("status")).toHaveTextContent("ready: Alpha");
    expect(fetchItemDetail).toHaveBeenCalledOnce();
  });

  describe("with unsaved edits", () => {
    async function openDirty() {
      queueAnswers(1);
      const view = setup();
      await view.open(ALPHA);
      await view.user.click(
        screen.getByRole("button", { name: "Edit something" }),
      );
      await view.user.keyboard("{Escape}");
      return view;
    }

    it("asks before closing and keeps the sheet and its request", async () => {
      await openDirty();

      expect(
        await screen.findByRole("alertdialog", { name: "Discard changes?" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("status", { hidden: true })).toBeInTheDocument();
      expect(signalOfCall(0).aborted).toBe(false);
    });

    it("keeps the sheet open on Keep editing", async () => {
      const { user } = await openDirty();
      await screen.findByRole("alertdialog");

      await user.click(screen.getByRole("button", { name: "Keep editing" }));

      await waitFor(() => {
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      });
      expect(screen.getByRole("dialog", { name: "Alpha" })).toBeInTheDocument();
      expect(signalOfCall(0).aborted).toBe(false);

      // The edits are still unsaved, so the next Esc asks again.
      await user.keyboard("{Escape}");

      expect(
        await screen.findByRole("alertdialog", { name: "Discard changes?" }),
      ).toBeInTheDocument();
      expect(signalOfCall(0).aborted).toBe(false);
    });

    it("closes the sheet on Discard, and lets its request finish", async () => {
      const { user } = await openDirty();
      await screen.findByRole("alertdialog");

      await user.click(screen.getByRole("button", { name: "Discard" }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
      expect(signalOfCall(0).aborted).toBe(false);
    });
  });
});
