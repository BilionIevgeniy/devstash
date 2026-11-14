import { afterEach, describe, expect, it } from "vitest";
import { useRef } from "react";

import { fireEvent, render } from "../../../../test/intl";
import { useScrollRestore } from "@/components/common/hooks/use-scroll-restore";

function List({ storageKey }: { storageKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollRestore(ref, storageKey);
  return <div ref={ref} />;
}

function renderInMain(storageKey: string) {
  const main = document.createElement("main");
  document.body.append(main);
  const view = render(<List storageKey={storageKey} />, { container: main });
  return { main, ...view };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("useScrollRestore", () => {
  it("sets the <main> back to the place it had when the list left, for the same key", () => {
    const first = renderInMain("favorites:bf-1");
    first.main.scrollTop = 640;
    fireEvent.scroll(first.main);
    first.unmount();
    first.main.remove();

    const back = renderInMain("favorites:bf-1");

    expect(back.main.scrollTop).toBe(640);
  });

  // A push or replace gives a new bfcacheId: a fresh visit starts at the top.
  it("leaves the place alone for a key with nothing kept", () => {
    const first = renderInMain("pinned:bf-1");
    first.main.scrollTop = 640;
    fireEvent.scroll(first.main);
    first.unmount();
    first.main.remove();

    const fresh = renderInMain("pinned:bf-2");

    expect(fresh.main.scrollTop).toBe(0);
  });
});
