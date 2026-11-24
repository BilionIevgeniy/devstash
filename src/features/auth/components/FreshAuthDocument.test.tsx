import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "../../../../test/intl";

const replace = vi.fn();

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function load() {
  vi.stubGlobal("location", { ...window.location, replace });
  const marker = await import("@/features/auth/components/app-shell-document");
  const { FreshAuthDocument } =
    await import("@/features/auth/components/FreshAuthDocument");
  return { marker, FreshAuthDocument };
}

describe("FreshAuthDocument", () => {
  it("does nothing in a document that never showed the app", async () => {
    const { FreshAuthDocument } = await load();

    render(<FreshAuthDocument />);

    expect(replace).not.toHaveBeenCalled();
  });

  it("loads the page again when the app shell was in this document", async () => {
    const { marker, FreshAuthDocument } = await load();
    marker.markAppShellShown();

    render(<FreshAuthDocument />);

    expect(replace).toHaveBeenCalledExactlyOnceWith(window.location.href);
  });
});
