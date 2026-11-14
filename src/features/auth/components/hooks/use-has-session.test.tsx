import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook } from "../../../../../test/intl";

const fetchHasSession = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/_internal/components/fetch-has-session", () => ({
  fetchHasSession,
}));

import {
  forgetSessionAnswer,
  useHasSession,
} from "@/features/auth/components/hooks/use-has-session";

describe("useHasSession", () => {
  beforeEach(() => {
    forgetSessionAnswer();
  });

  it("is unknown until the answer comes, then tells it", async () => {
    const answer = Promise.withResolvers<boolean>();
    fetchHasSession.mockReturnValue(answer.promise);

    const { result } = renderHook(() => useHasSession());
    expect(result.current).toBeNull();

    await act(async () => answer.resolve(true));
    expect(result.current).toBe(true);
  });

  // The homepage's navbar remounts when / and /de swap layouts: it must not
  // start over as a guest while the check runs again.
  it("starts a remount from the tab's last answer", async () => {
    fetchHasSession.mockResolvedValue(true);
    const first = renderHook(() => useHasSession());
    await act(async () => {});
    first.unmount();

    const again = Promise.withResolvers<boolean>();
    fetchHasSession.mockReturnValue(again.promise);
    const { result } = renderHook(() => useHasSession());

    expect(result.current).toBe(true);
    expect(fetchHasSession).toHaveBeenCalledTimes(2);

    await act(async () => again.resolve(false));
    expect(result.current).toBe(false);
  });

  it("counts a failure with no answer yet as a guest", async () => {
    fetchHasSession.mockRejectedValue(new TypeError("offline"));

    const { result } = renderHook(() => useHasSession());
    await act(async () => {});

    expect(result.current).toBe(false);
  });

  it("keeps the last answer when a later check fails", async () => {
    fetchHasSession.mockResolvedValue(true);
    const first = renderHook(() => useHasSession());
    await act(async () => {});
    first.unmount();

    fetchHasSession.mockRejectedValue(new TypeError("offline"));
    const { result } = renderHook(() => useHasSession());
    await act(async () => {});

    expect(result.current).toBe(true);
  });
});
