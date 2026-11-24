import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook } from "../../../../../../test/intl";
import { useFrameText } from "@/features/ai/_internal/components/hooks/use-frame-text";
import { STREAM_END_MARK } from "@/features/ai/domain/text-stream";

let frames: Map<number, FrameRequestCallback>;

function nextFrame() {
  const due = [...frames.values()];
  frames.clear();
  act(() => due.forEach((callback) => callback(0)));
}

describe("useFrameText", () => {
  beforeEach(() => {
    frames = new Map();
    let id = 0;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.set(++id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (frame: number) =>
      frames.delete(frame),
    );
  });

  // Each render parses the whole Markdown again.
  it("shows all pieces of one frame in one render", () => {
    const { result } = renderHook(() => useFrameText());

    act(() => {
      result.current.append("Hel");
      result.current.append("lo");
    });
    expect(result.current.text).toBe("");
    expect(frames.size).toBe(1);

    nextFrame();
    expect(result.current.text).toBe("Hello");
  });

  it("finish shows the rest at once and tells whether the end mark came", () => {
    const { result } = renderHook(() => useFrameText());

    act(() => result.current.append("Hello"));
    let complete = true;
    act(() => {
      complete = result.current.finish();
    });
    expect(complete).toBe(false);
    expect(result.current.text).toBe("Hello");
    expect(frames.size).toBe(0);

    act(() => {
      result.current.append(STREAM_END_MARK);
      complete = result.current.finish();
    });
    expect(complete).toBe(true);
    expect(result.current.text).toBe("Hello");
  });

  it("start keeps the last answer on screen until the new one writes", () => {
    const { result } = renderHook(() => useFrameText());
    act(() => {
      result.current.append("old");
      result.current.finish();
    });

    act(() => result.current.start());
    expect(result.current.text).toBe("old");

    act(() => result.current.append("new"));
    nextFrame();
    expect(result.current.text).toBe("new");
  });

  it("clear drops the answer and the frame that would bring it back", () => {
    const { result } = renderHook(() => useFrameText());

    act(() => {
      result.current.append("gone");
      result.current.clear();
    });

    expect(frames.size).toBe(0);
    expect(result.current.text).toBe("");
  });

  it("asks for no frame once it is unmounted", () => {
    const { result, unmount } = renderHook(() => useFrameText());

    act(() => result.current.append("late"));
    unmount();

    expect(frames.size).toBe(0);
  });
});
