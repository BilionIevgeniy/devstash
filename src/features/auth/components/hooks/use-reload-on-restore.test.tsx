import { renderHook } from "../../../../../test/intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useReloadOnRestore } from "@/features/auth/components/hooks/use-reload-on-restore";

const reload = vi.fn();

afterEach(() => {
  vi.unstubAllGlobals();
});

function show(persisted: boolean) {
  window.dispatchEvent(
    Object.assign(new Event("pageshow"), { persisted }) as PageTransitionEvent,
  );
}

describe("useReloadOnRestore", () => {
  it("loads a page again that the browser restored from its back-forward cache", () => {
    vi.stubGlobal("location", { ...window.location, reload });
    renderHook(() => useReloadOnRestore());

    show(false);
    expect(reload).not.toHaveBeenCalled();

    show(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("stops listening once unmounted", () => {
    vi.stubGlobal("location", { ...window.location, reload });
    const { unmount } = renderHook(() => useReloadOnRestore());
    unmount();

    show(true);

    expect(reload).not.toHaveBeenCalled();
  });
});
