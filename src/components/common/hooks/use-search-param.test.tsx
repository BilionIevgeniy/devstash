import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useSearchParams } = vi.hoisted(() => ({ useSearchParams: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams }));

import { useSearchParam } from "@/components/common/hooks/use-search-param";

describe("useSearchParam", () => {
  it("removes the parameter for its default value", () => {
    window.history.replaceState(null, "", "/pinned?sort=a-z");
    const { result } = renderHook(() => useSearchParam("sort", "newest"));

    act(() => result.current[1]("newest"));

    expect(window.location.pathname + window.location.search).toBe("/pinned");
  });

  beforeEach(() => {
    window.history.replaceState(null, "", "/favorites?itemSort=a-z&other=1");
    useSearchParams.mockReturnValue(
      new URLSearchParams(window.location.search),
    );
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("reads the parameter from the URL", () => {
    const { result } = renderHook(() => useSearchParam("itemSort"));

    expect(result.current[0]).toBe("a-z");
  });

  it("replaces the URL and keeps the other parameters", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    const pushState = vi.spyOn(window.history, "pushState");
    const { result } = renderHook(() => useSearchParam("itemSort"));

    act(() => result.current[1]("z-a"));

    expect(window.location.pathname + window.location.search).toBe(
      "/favorites?itemSort=z-a&other=1",
    );
    expect(replaceState).toHaveBeenCalledOnce();
    expect(pushState).not.toHaveBeenCalled();
  });

  it("removes the parameter for null, down to the bare path", () => {
    window.history.replaceState(null, "", "/favorites?itemSort=a-z");
    const { result } = renderHook(() => useSearchParam("itemSort"));

    act(() => result.current[1](null));

    expect(window.location.pathname + window.location.search).toBe(
      "/favorites",
    );
  });
});
