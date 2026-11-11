import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { revokeGitHubGrant } from "@/features/auth/_internal/services/github-grant";
import { logger } from "@/lib/logger";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const fetchMock = vi.fn();

function answerWith(status: number) {
  fetchMock.mockResolvedValue(new Response(null, { status }));
}

describe("revokeGitHubGrant", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_GITHUB_ID", "client-id");
    vi.stubEnv("AUTH_GITHUB_SECRET", "client-secret");
    vi.stubGlobal("fetch", fetchMock);
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("logs nothing after a 204", async () => {
    answerWith(204);

    await revokeGitHubGrant("token");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("logs nothing after a 404: a stored token is usually dead", async () => {
    answerWith(404);

    await revokeGitHubGrant("token");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("logs any other status", async () => {
    answerWith(422);

    await revokeGitHubGrant("token");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledExactlyOnceWith(
      "Revoking the GitHub authorization was refused",
      { numbers: { status: 422 } },
    );
  });

  it("never throws, so a failure cannot stop an account deletion", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(revokeGitHubGrant("token")).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it("makes no request without the app's credentials", async () => {
    vi.stubEnv("AUTH_GITHUB_SECRET", "");

    await revokeGitHubGrant("token");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
