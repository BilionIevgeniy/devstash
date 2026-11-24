import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

import { CatchBoundary } from "../../../../../../test/catch-boundary";
import { act, renderHook, screen } from "../../../../../../test/intl";

const generateAutoTags = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ error: vi.fn(), info: vi.fn() }));
vi.mock("@/features/ai/actions/auto-tags", () => ({ generateAutoTags }));
vi.mock("sonner", () => ({ toast }));

import { useTagSuggestions } from "@/features/ai/_internal/components/hooks/use-tag-suggestions";
import { fail, ok } from "@/lib/errors/action-result";

function setup(existing: string[] = []) {
  return renderHook(() =>
    useTagSuggestions((tag: string) => existing.includes(tag)),
  );
}

describe("useTagSuggestions", () => {
  beforeEach(() => {
    generateAutoTags.mockResolvedValue(ok(["react", "hooks"]));
  });

  it("suggests the tags the form does not have yet, and announces them once", async () => {
    const { result } = setup(["react"]);

    await act(async () => result.current.suggest("title", "content"));

    expect(generateAutoTags).toHaveBeenCalledExactlyOnceWith({
      title: "title",
      content: "content",
    });
    expect(result.current.suggestions).toEqual(["hooks"]);
    expect(result.current.announcement).not.toBe("");
    expect(result.current.answerId).toBe(1);
  });

  it("says so when there is nothing new", async () => {
    const { result } = setup(["react", "hooks"]);

    await act(async () => result.current.suggest("title", "content"));

    expect(toast.info).toHaveBeenCalledOnce();
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.answerId).toBe(1);
  });

  it("removes one suggestion and keeps the announcement", async () => {
    const { result } = setup();
    await act(async () => result.current.suggest("title", "content"));
    const { announcement } = result.current;

    act(() => result.current.remove("react"));

    expect(result.current.suggestions).toEqual(["hooks"]);
    expect(result.current.announcement).toBe(announcement);
    expect(result.current.answerId).toBe(1);
  });

  it("shows a refusal and keeps the suggestions on screen", async () => {
    const { result } = setup();
    await act(async () => result.current.suggest("title", "content"));
    generateAutoTags.mockResolvedValue(fail("aiDailyLimit"));

    await act(async () => result.current.suggest("title", "content"));

    expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      "Daily AI limit reached. Try again tomorrow.",
    );
    expect(result.current.suggestions).toEqual(["react", "hooks"]);
    expect(result.current.answerId).toBe(1);
  });

  it("shows a failed call as unavailable", async () => {
    generateAutoTags.mockRejectedValue(new TypeError("offline"));
    const { result } = setup();

    await act(async () => result.current.suggest("title", "content"));

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
    generateAutoTags.mockImplementation(() => gate.promise.then(settle));
    const { result, unmount } = setup();

    act(() => result.current.suggest("title", "content"));
    unmount();
    await act(async () => gate.resolve());

    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });

  it("lets the redirect of a signed-out caller go on, with no toast", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    generateAutoTags.mockImplementation(async () => redirect("/sign-in"));
    const { result } = renderHook(() => useTagSuggestions(() => false), {
      wrapper: CatchBoundary,
    });

    await act(async () => result.current.suggest("title", "content"));

    expect(screen.getByText(/Caught: NEXT_REDIRECT/)).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
