import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

import { CatchBoundary } from "../../../../../../test/catch-boundary";
import { act, renderHook, screen } from "../../../../../../test/intl";

const generateSummary = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("@/features/ai/actions/summary", () => ({ generateSummary }));
vi.mock("sonner", () => ({ toast }));

import { useDescriptionSummary } from "@/features/ai/_internal/components/hooks/use-description-summary";
import { fail, ok } from "@/lib/errors/action-result";

const setup = () => renderHook(() => useDescriptionSummary());

describe("useDescriptionSummary", () => {
  beforeEach(() => {
    generateSummary.mockResolvedValue(ok("A debounce hook."));
  });

  it("shows the summary and announces it", async () => {
    const { result } = setup();

    await act(async () => result.current.generate("title", "content"));

    expect(generateSummary).toHaveBeenCalledExactlyOnceWith({
      title: "title",
      content: "content",
    });
    expect(result.current).toMatchObject({
      summary: "A debounce hook.",
      announcement: "Summary ready",
      answerId: 1,
    });
  });

  // The words never change, so a live region that kept them says nothing the
  // second time.
  it("clears the announcement with the summary, so the next one is heard", async () => {
    const { result } = setup();
    await act(async () => result.current.generate("title", "content"));

    act(() => result.current.clear());
    expect(result.current).toMatchObject({ summary: null, announcement: "" });

    await act(async () => result.current.generate("title", "content"));
    expect(result.current).toMatchObject({
      announcement: "Summary ready",
      answerId: 2,
    });
  });

  it("shows a refusal and keeps the last summary", async () => {
    const { result } = setup();
    await act(async () => result.current.generate("title", "content"));
    generateSummary.mockResolvedValue(fail("aiDailyLimit"));

    await act(async () => result.current.generate("title", "content"));

    expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      "Daily AI limit reached. Try again tomorrow.",
    );
    expect(result.current).toMatchObject({
      summary: "A debounce hook.",
      answerId: 1,
    });
  });

  it("shows a failed call as unavailable", async () => {
    generateSummary.mockRejectedValue(new TypeError("offline"));
    const { result } = setup();

    await act(async () => result.current.generate("title", "content"));

    expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      "AI is unavailable right now.",
    );
  });

  // The action cannot be aborted: the form may be closed when it answers.
  it.each([
    ["an answer", () => Promise.resolve(fail("aiDailyLimit"))],
    ["a failure", () => Promise.reject(new TypeError("offline"))],
  ])("drops %s that comes after the form closed", async (_name, settle) => {
    const gate = Promise.withResolvers<void>();
    generateSummary.mockImplementation(() => gate.promise.then(settle));
    const { result, unmount } = setup();

    act(() => result.current.generate("title", "content"));
    unmount();
    await act(async () => gate.resolve());

    expect(toast.error).not.toHaveBeenCalled();
  });

  it("lets the redirect of a signed-out caller go on, with no toast", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    generateSummary.mockImplementation(async () => redirect("/sign-in"));
    const { result } = renderHook(() => useDescriptionSummary(), {
      wrapper: CatchBoundary,
    });

    await act(async () => result.current.generate("title", "content"));

    expect(screen.getByText(/Caught: NEXT_REDIRECT/)).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
