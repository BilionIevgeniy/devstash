import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
const startPromptOptimization = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/nextauth/auth", () => ({ auth }));
vi.mock("@/features/ai/services/prompt-optimizer", () => ({
  startPromptOptimization,
}));

import { maxDuration, POST } from "@/app/api/ai/optimize-prompt/route";

const body = { title: "Review", prompt: "review my code" };

function post(payload: unknown) {
  return POST(
    new Request("http://localhost/api/ai/optimize-prompt", {
      method: "POST",
      body: typeof payload === "string" ? payload : JSON.stringify(payload),
    }),
  );
}

describe("POST /api/ai/optimize-prompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    auth.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("allows 60 seconds, above the service's own deadline", () => {
    expect(maxDuration).toBe(60);
  });

  it("answers 401 without a session", async () => {
    auth.mockResolvedValue(null);

    const response = await post(body);

    expect(response.status).toBe(401);
    expect(startPromptOptimization).not.toHaveBeenCalled();
  });

  it.each([["not json"], [{ ...body, prompt: "  " }], [{ title: "x" }]])(
    "answers 400 for %j",
    async (payload) => {
      const response = await post(payload);

      expect(response.status).toBe(400);
      expect(startPromptOptimization).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["not-pro", 403],
    ["limited", 429],
  ])("answers a %s refusal with %i", async (reason, status) => {
    startPromptOptimization.mockResolvedValue({
      status: "refused",
      reason,
      failure: { success: false, data: null, error: "aiProOnly" },
    });

    const response = await post(body);

    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("answers 503 for an AI failure before any text", async () => {
    startPromptOptimization.mockResolvedValue({
      status: "failed",
      failure: { success: false, data: null, error: "aiBusy" },
    });

    const response = await post(body);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "aiBusy" });
  });

  it("answers an empty 204 when the client went away", async () => {
    startPromptOptimization.mockResolvedValue({ status: "aborted" });

    const response = await post(body);

    expect(response.status).toBe(204);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("answers 500 for an unexpected failure", async () => {
    startPromptOptimization.mockRejectedValue(new TypeError("bug"));

    const response = await post(body);

    expect(response.status).toBe(500);
  });

  it("streams the answer as plain text with the request's signal", async () => {
    startPromptOptimization.mockResolvedValue({
      status: "ok",
      stream: new Response("Review the diff.").body,
    });

    const response = await post(body);

    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.text()).resolves.toBe("Review the diff.");
    expect(startPromptOptimization.mock.calls[0][2]).toBeInstanceOf(
      AbortSignal,
    );
  });
});
