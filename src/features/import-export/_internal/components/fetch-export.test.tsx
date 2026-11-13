import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { downloadExport } from "@/features/import-export/_internal/components/fetch-export";

const fetchMock = vi.fn();
const click = vi.fn();

function answer(body: string, init: ResponseInit = {}) {
  fetchMock.mockResolvedValue(new Response(body, init));
}

describe("downloadExport", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    // jsdom has no object URLs and does not download.
    URL.createObjectURL = vi.fn(() => "blob:export");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(click);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves a complete file under the name the server gave", async () => {
    answer('{"version":1,"items":[]}', {
      headers: {
        "Content-Disposition":
          'attachment; filename="devstash-export-2026-11-12.json"',
      },
    });

    await expect(downloadExport()).resolves.toEqual({ error: null });
    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe("devstash-export-2026-11-12.json");
  });

  it("does not save a file the stream cut short", async () => {
    answer('{"version":1,"items":[{"id":"i1"}');

    await expect(downloadExport()).resolves.toEqual({
      error: { error: "exportInterrupted" },
    });
    expect(click).not.toHaveBeenCalled();
  });

  it("passes on the route's refusal with its code", async () => {
    answer(JSON.stringify({ error: "exportRateLimited" }), {
      status: 429,
    });

    await expect(downloadExport()).resolves.toEqual({
      error: { success: false, data: null, error: "exportRateLimited" },
    });
  });

  it("says when the server could not be reached", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const { error } = await downloadExport();

    expect(error).toEqual({ error: "exportDownloadFailed" });
  });
});
