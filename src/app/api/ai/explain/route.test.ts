import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
const startExplanation = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/nextauth/auth", () => ({ auth }));
vi.mock("@/features/ai/services/explain", () => ({ startExplanation }));

import { POST } from "@/app/api/ai/explain/route";

const body = { title: "useAuth", language: "bash", code: "ls -la" };

function post(payload: unknown) {
  return POST(
    new Request("http://localhost/api/ai/explain", {
      method: "POST",
      body: typeof payload === "string" ? payload : JSON.stringify(payload),
    }),
  );
}

describe("POST /api/ai/explain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    auth.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("answers 401 in plain words without a session", async () => {
    auth.mockResolvedValue(null);

    const response = await post(body);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Your session ended. Sign in again.",
    });
    expect(startExplanation).not.toHaveBeenCalled();
  });

  it.each([["not json"], [{ ...body, code: "  " }], [{ title: "x" }]])(
    "answers 400 for %j",
    async (payload) => {
      const response = await post(payload);

      expect(response.status).toBe(400);
      expect(startExplanation).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["not-pro", 403],
    ["limited", 429],
  ])("answers a %s refusal with %i", async (reason, status) => {
    startExplanation.mockResolvedValue({
      status: "refused",
      reason,
      error: "No",
    });

    const response = await post(body);

    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("answers 503 for an AI failure before any text", async () => {
    startExplanation.mockResolvedValue({ status: "failed", error: "Busy" });

    const response = await post(body);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "Busy" });
  });

  it("answers an empty 204 when the client went away", async () => {
    startExplanation.mockResolvedValue({ status: "aborted" });

    const response = await post(body);

    expect(response.status).toBe(204);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("answers 500 for an unexpected failure", async () => {
    startExplanation.mockRejectedValue(new TypeError("bug"));

    const response = await post(body);

    expect(response.status).toBe(500);
  });

  it("streams the answer as plain text that no cache keeps", async () => {
    startExplanation.mockResolvedValue({
      status: "ok",
      stream: new Response("It lists files.").body,
    });

    const response = await post(body);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.text()).resolves.toBe("It lists files.");
  });

  it("passes the request's signal down, so a closed drawer stops OpenAI", async () => {
    startExplanation.mockResolvedValue({ status: "aborted" });

    await post(body);

    expect(startExplanation.mock.calls[0][2]).toBeInstanceOf(AbortSignal);
  });
});
