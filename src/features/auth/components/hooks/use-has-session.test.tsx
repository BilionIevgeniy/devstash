import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook } from "../../../../../test/intl";

const fetchHasSession = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/_internal/components/fetch-has-session", () => ({
  fetchHasSession,
}));

import {
  forgetSessionAnswer,
  primeSessionCheck,
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

  it("sends one request for the callers mounted together", async () => {
    const answer = Promise.withResolvers<boolean>();
    fetchHasSession.mockReturnValue(answer.promise);

    const first = renderHook(() => useHasSession());
    const second = renderHook(() => useHasSession());
    await act(async () => answer.resolve(true));

    expect(fetchHasSession).toHaveBeenCalledOnce();
    expect(first.result.current).toBe(true);
    expect(second.result.current).toBe(true);
  });

  it("aborts the shared request only when its last caller unmounts", async () => {
    fetchHasSession.mockReturnValue(new Promise(() => undefined));

    const first = renderHook(() => useHasSession());
    const second = renderHook(() => useHasSession());
    const signal: AbortSignal = fetchHasSession.mock.calls[0][0];
    first.unmount();
    expect(signal.aborted).toBe(false);

    second.unmount();
    expect(signal.aborted).toBe(true);
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

describe("a primed check", () => {
  beforeEach(() => {
    forgetSessionAnswer();
    fetchHasSession.mockResolvedValue(true);
  });

  it("is shared by every caller of the first mount, also after its answer", async () => {
    primeSessionCheck();
    await act(async () => {});

    const first = renderHook(() => useHasSession());
    const second = renderHook(() => useHasSession());
    await act(async () => {});

    expect(fetchHasSession).toHaveBeenCalledOnce();
    expect(first.result.current).toBe(true);
    expect(second.result.current).toBe(true);
  });

  it("is shared while it still runs, and starts only once", async () => {
    const answer = Promise.withResolvers<boolean>();
    fetchHasSession.mockReturnValue(answer.promise);
    primeSessionCheck();
    primeSessionCheck();

    const { result } = renderHook(() => useHasSession());
    expect(result.current).toBeNull();
    await act(async () => answer.resolve(false));

    expect(result.current).toBe(false);
    expect(fetchHasSession).toHaveBeenCalledOnce();
  });

  it("is over when its last caller has left: the next mount asks again", async () => {
    primeSessionCheck();
    renderHook(() => useHasSession()).unmount();
    await act(async () => {});

    renderHook(() => useHasSession());
    await act(async () => {});

    expect(fetchHasSession).toHaveBeenCalledTimes(2);
  });

  // The visitor may have signed in since.
  it("is too old for a caller that mounts much later", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000);
    primeSessionCheck();
    await act(async () => {});

    now.mockReturnValue(12_000);
    renderHook(() => useHasSession());
    await act(async () => {});

    expect(fetchHasSession).toHaveBeenCalledTimes(2);
  });

  // The navbar stays mounted from page to page; a call to action mounts anew.
  it("is asked again by a later caller while an earlier one stays", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000);
    primeSessionCheck();
    const navbar = renderHook(() => useHasSession());
    await act(async () => {});
    expect(navbar.result.current).toBe(true);

    now.mockReturnValue(12_000);
    fetchHasSession.mockResolvedValue(false);
    renderHook(() => useHasSession());
    await act(async () => {});

    expect(fetchHasSession).toHaveBeenCalledTimes(2);
    expect(navbar.result.current).toBe(false);
  });

  it("is shared while it runs for someone, however long that takes", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000);
    fetchHasSession.mockReturnValue(new Promise(() => undefined));
    primeSessionCheck();
    renderHook(() => useHasSession());

    now.mockReturnValue(12_000);
    renderHook(() => useHasSession());

    expect(fetchHasSession).toHaveBeenCalledOnce();
  });

  it("is aborted by its last caller while it runs, which is no failure", async () => {
    fetchHasSession.mockImplementation(
      (signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason));
        }),
    );
    primeSessionCheck();
    const signal: AbortSignal = fetchHasSession.mock.calls[0][0];

    renderHook(() => useHasSession()).unmount();
    await act(async () => {});
    expect(signal.aborted).toBe(true);

    fetchHasSession.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useHasSession());
    expect(result.current).toBeNull();
  });
});
