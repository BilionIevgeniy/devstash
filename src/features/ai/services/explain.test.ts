import { beforeEach, describe, expect, it, vi } from "vitest";

const startTextStream = vi.hoisted(() => vi.fn());
vi.mock("@/features/ai/services/text-stream", () => ({ startTextStream }));

import { EXPLAIN_CODE_MAX } from "@/features/ai/domain/input";
import { EXPLAIN_SETTINGS } from "@/features/ai/domain/model";
import { startExplanation } from "@/features/ai/services/explain";

const input = { title: "useAuth", language: "bash", code: "ls -la" };

function sent() {
  return startTextStream.mock.calls[0][1];
}

// The stream itself (refusals, deadlines, abort) is tested in text-stream.test.
describe("startExplanation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startTextStream.mockResolvedValue({ status: "aborted" });
  });

  it("streams with the explain settings for the user", async () => {
    const signal = new AbortController().signal;
    await startExplanation("user-1", input, signal);

    expect(startTextStream).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        operation: "explain",
        settings: EXPLAIN_SETTINGS,
      }),
      signal,
    );
  });

  it("names the language and sends only the start of long code", async () => {
    await startExplanation(
      "user-1",
      { ...input, code: "c".repeat(EXPLAIN_CODE_MAX + 50) },
      new AbortController().signal,
    );

    expect(sent().input).toContain("useAuth (Shell)");
    expect(sent().input).toContain("c".repeat(EXPLAIN_CODE_MAX));
    expect(sent().input).not.toContain("c".repeat(EXPLAIN_CODE_MAX + 1));
  });

  it("leaves the language out when the code has none", async () => {
    await startExplanation(
      "user-1",
      { ...input, language: null },
      new AbortController().signal,
    );

    expect(sent().input).toContain("Title: useAuth\n");
  });
});
