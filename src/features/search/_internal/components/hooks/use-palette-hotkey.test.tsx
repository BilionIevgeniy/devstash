import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usePaletteHotkey } from "@/features/search/_internal/components/hooks/use-palette-hotkey";

function pressCmdK(): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key: "k",
    code: "KeyK",
    metaKey: true,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  return event;
}

function keydownListenerCalls(spy: { mock: { calls: unknown[][] } }) {
  return spy.mock.calls.filter(([type]) => type === "keydown");
}

afterEach(() => {
  // The spies of the first test too, even when one of its assertions failed.
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("usePaletteHotkey", () => {
  it("adds the listener once, however often the props change", () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    const { rerender, unmount } = renderHook(
      ({ isOpen, onToggle }) => usePaletteHotkey(isOpen, onToggle),
      { initialProps: { isOpen: false, onToggle: vi.fn() } },
    );

    rerender({ isOpen: true, onToggle: vi.fn() });
    rerender({ isOpen: false, onToggle: vi.fn() });

    expect(keydownListenerCalls(add)).toHaveLength(1);
    expect(keydownListenerCalls(remove)).toHaveLength(0);
    unmount();
    expect(keydownListenerCalls(remove)).toHaveLength(1);
  });

  it("toggles through the latest callback", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ onToggle }) => usePaletteHotkey(false, onToggle),
      { initialProps: { onToggle: first } },
    );

    rerender({ onToggle: second });
    const event = pressCmdK();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it("leaves the key alone over another modal while the palette is closed", () => {
    const onToggle = vi.fn();
    renderHook(() => usePaletteHotkey(false, onToggle));
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.append(dialog);

    const event = pressCmdK();

    expect(onToggle).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("still closes the open palette, which is itself a dialog", () => {
    const onToggle = vi.fn();
    const { rerender } = renderHook(
      ({ isOpen }) => usePaletteHotkey(isOpen, onToggle),
      { initialProps: { isOpen: false } },
    );
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.append(dialog);

    rerender({ isOpen: true });
    pressCmdK();

    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("ignores a held key", () => {
    const onToggle = vi.fn();
    renderHook(() => usePaletteHotkey(false, onToggle));

    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        code: "KeyK",
        ctrlKey: true,
        repeat: true,
        cancelable: true,
      }),
    );

    expect(onToggle).not.toHaveBeenCalled();
  });
});
