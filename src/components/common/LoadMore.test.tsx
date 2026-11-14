import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { act, render, screen } from "../../../test/intl";
import { LoadMore } from "@/components/common/LoadMore";

// jsdom has no IntersectionObserver: this one lets the test say when the
// sentinel enters or leaves the view.
let observerCallback: IntersectionObserverCallback | null = null;

class FakeIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    observerCallback = callback;
  }
  observe() {}
  disconnect() {}
}

function setInView(isIntersecting: boolean) {
  act(() => {
    observerCallback?.(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  });
}

interface Props {
  rowCount?: number;
  hasMore?: boolean;
  isLoading?: boolean;
  failed?: boolean;
}

const onLoad = vi.fn();
const onFocusRow = vi.fn();

function ui({
  rowCount = 30,
  hasMore = true,
  isLoading = false,
  failed = false,
}: Props = {}) {
  return (
    <LoadMore
      rowCount={rowCount}
      hasMore={hasMore}
      isLoading={isLoading}
      failed={failed}
      onLoad={onLoad}
      onFocusRow={onFocusRow}
    />
  );
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  observerCallback = null;
});

describe("LoadMore", () => {
  it("asks for the next page when the end of the list comes into view", () => {
    render(ui());

    setInView(true);

    expect(onLoad).toHaveBeenCalledOnce();
  });

  it("asks again when a page ends while the end is still in view", () => {
    const { rerender } = render(ui());
    setInView(true);
    rerender(ui({ isLoading: true }));

    rerender(ui({ rowCount: 60 }));

    expect(onLoad).toHaveBeenCalledTimes(2);
  });

  it("stops asking once the end has left the view", () => {
    const { rerender } = render(ui());
    setInView(true);
    rerender(ui({ isLoading: true }));
    setInView(false);

    rerender(ui({ rowCount: 60 }));

    expect(onLoad).toHaveBeenCalledOnce();
  });

  it("does not ask on its own after a failed page, and offers Try again", async () => {
    const user = userEvent.setup();
    const { rerender } = render(ui());
    setInView(true);
    rerender(ui({ isLoading: true }));
    rerender(ui({ failed: true }));

    expect(onLoad).toHaveBeenCalledOnce();
    expect(screen.getByText("Couldn't load more items.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onLoad).toHaveBeenCalledTimes(2);
  });

  it("shows the pending state on the button while a page loads", () => {
    render(ui({ isLoading: true }));

    expect(screen.getByRole("button", { name: "Loading…" })).toBeDisabled();
  });

  it("gives the focus to the first new row after a load the button asked for, and announces it", async () => {
    const user = userEvent.setup();
    const { rerender } = render(ui());

    await user.click(screen.getByRole("button", { name: "Load more" }));
    rerender(ui({ isLoading: true }));
    rerender(ui({ rowCount: 45, hasMore: false }));

    expect(onFocusRow).toHaveBeenCalledExactlyOnceWith(30);
    expect(screen.getByRole("status")).toHaveTextContent(
      "15 more items loaded",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("moves no focus after a load the scroll asked for", () => {
    const { rerender } = render(ui());
    setInView(true);
    rerender(ui({ isLoading: true }));

    rerender(ui({ rowCount: 60 }));

    expect(onFocusRow).not.toHaveBeenCalled();
  });
});
