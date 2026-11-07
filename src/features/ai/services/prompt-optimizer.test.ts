import { beforeEach, describe, expect, it, vi } from "vitest";

const startTextStream = vi.hoisted(() => vi.fn());
vi.mock("@/features/ai/services/text-stream", () => ({ startTextStream }));

import { PROMPT_OPTIMIZE_CONTENT_MAX } from "@/features/ai/domain/input";
import { PROMPT_OPTIMIZE_SETTINGS } from "@/features/ai/domain/model";
import { PROMPT_OPTIMIZE_INSTRUCTIONS } from "@/features/ai/domain/prompt-optimizer";
import { startPromptOptimization } from "@/features/ai/services/prompt-optimizer";

const input = { title: "Review", prompt: "review my code" };

// The stream itself (refusals, deadlines, abort) is tested in text-stream.test.
describe("startPromptOptimization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startTextStream.mockResolvedValue({ status: "aborted" });
  });

  it("streams with the optimize settings and instructions", async () => {
    const signal = new AbortController().signal;
    await startPromptOptimization("user-1", input, signal);

    expect(startTextStream).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        operation: "optimize-prompt",
        settings: PROMPT_OPTIMIZE_SETTINGS,
        instructions: PROMPT_OPTIMIZE_INSTRUCTIONS,
      }),
      signal,
    );
  });

  it("sends only the start of a long prompt", async () => {
    await startPromptOptimization(
      "user-1",
      { ...input, prompt: "p".repeat(PROMPT_OPTIMIZE_CONTENT_MAX + 50) },
      new AbortController().signal,
    );

    const { input: sent } = startTextStream.mock.calls[0][1];
    expect(sent).toContain("Title: Review");
    expect(sent).toContain("p".repeat(PROMPT_OPTIMIZE_CONTENT_MAX));
    expect(sent).not.toContain("p".repeat(PROMPT_OPTIMIZE_CONTENT_MAX + 1));
  });
});
