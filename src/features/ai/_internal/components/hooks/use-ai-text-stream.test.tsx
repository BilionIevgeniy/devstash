import { describe, expect, it, vi } from "vitest";

import { act, renderHook } from "../../../../../../test/intl";

const streamAiText = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/features/ai/_internal/components/stream-ai-text", () => {
  class AiStreamRequestError extends Error {
    failure: unknown;
    constructor(failure: unknown) {
      super("refused");
      this.failure = failure;
    }
  }
  return { streamAiText, AiStreamRequestError };
});

import { useAiTextStream } from "@/features/ai/_internal/components/hooks/use-ai-text-stream";
import { AiStreamRequestError } from "@/features/ai/_internal/components/stream-ai-text";
import { STREAM_END_MARK } from "@/features/ai/domain/text-stream";
import { fail } from "@/lib/errors/action-result";

type OnText = (text: string) => void;

// One call of streamAiText, driven by the test.
interface Stream {
  signal: AbortSignal;
  write: OnText;
  end: () => void;
  fail: (error: unknown) => void;
}

function streams() {
  const started: Stream[] = [];
  streamAiText.mockImplementation(
    (_url: string, _body: unknown, signal: AbortSignal, write: OnText) => {
      const { promise, resolve, reject } = Promise.withResolvers<void>();
      signal.addEventListener("abort", () => reject(signal.reason));
      started.push({ signal, write, end: resolve, fail: reject });
      return promise;
    },
  );
  return started;
}

function setup() {
  const started = streams();
  const view = renderHook(() =>
    useAiTextStream({
      url: "/api/ai/explain",
      doneAnnouncement: "done",
      cutShortAnnouncement: "cut",
    }),
  );
  return { started, ...view };
}

async function whole(stream: Stream, text: string) {
  await act(async () => {
    stream.write(text + STREAM_END_MARK);
    stream.end();
  });
}

describe("useAiTextStream", () => {
  it("shows the answer's view while it waits, then the whole answer", async () => {
    const { started, result } = setup();

    act(() => void result.current.run({}));
    expect(result.current).toMatchObject({ status: "waiting", view: "answer" });

    act(() => started[0].write("Hel"));
    expect(result.current.status).toBe("streaming");

    await whole(started[0], "lo");
    expect(result.current).toMatchObject({
      status: "done",
      text: "Hello",
      announcement: "done",
    });
  });

  it("calls an answer without the end mark cut short", async () => {
    const { started, result } = setup();

    act(() => void result.current.run({}));
    await act(async () => {
      started[0].write("Half");
      started[0].end();
    });

    expect(result.current).toMatchObject({
      status: "cut-short",
      text: "Half",
      announcement: "cut",
    });
  });

  it("keeps what it has when the stream breaks, with no toast", async () => {
    const { started, result } = setup();

    act(() => void result.current.run({}));
    await act(async () => {
      started[0].write("Half");
      started[0].fail(new TypeError("network"));
    });

    expect(result.current).toMatchObject({ status: "cut-short", text: "Half" });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("goes back to the item's text when the first answer is refused", async () => {
    const { started, result } = setup();

    act(() => void result.current.run({}));
    await act(async () =>
      started[0].fail(new AiStreamRequestError(fail("aiDailyLimit"))),
    );

    expect(result.current).toMatchObject({ status: "idle", view: "source" });
    expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      "Daily AI limit reached. Try again tomorrow.",
    );
  });

  it("keeps the last answer when a retry fails before its first words", async () => {
    const { started, result } = setup();
    act(() => void result.current.run({}));
    await whole(started[0], "First");

    act(() => void result.current.run({}));
    expect(result.current).toMatchObject({ status: "waiting", text: "First" });
    await act(async () => started[1].fail(new TypeError("network")));

    expect(result.current).toMatchObject({
      status: "done",
      view: "answer",
      text: "First",
    });
    expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      "AI is unavailable right now.",
    );
  });

  it("a new request aborts the last, which shows nothing", async () => {
    const { started, result } = setup();

    act(() => void result.current.run({}));
    act(() => void result.current.run({}));
    expect(started[0].signal.aborted).toBe(true);
    await whole(started[1], "Second");

    expect(result.current).toMatchObject({ status: "done", text: "Second" });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("unmounting aborts the request", async () => {
    const { started, result, unmount } = setup();

    act(() => void result.current.run({}));
    unmount();
    await act(async () => {});

    expect(started[0].signal.aborted).toBe(true);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("reset aborts and drops the answer", async () => {
    const { started, result } = setup();

    act(() => void result.current.run({}));
    act(() => started[0].write("Half"));
    await act(async () => result.current.reset());

    expect(started[0].signal.aborted).toBe(true);
    expect(result.current).toMatchObject({
      status: "idle",
      view: "source",
      text: "",
      announcement: "",
    });
    expect(toast.error).not.toHaveBeenCalled();
  });
});
