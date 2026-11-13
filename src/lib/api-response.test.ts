import { describe, expect, it } from "vitest";

import { jsonError, jsonOk } from "@/lib/api-response";

// The envelope the browser reads, and a header no shared cache may ignore.
describe("jsonOk", () => {
  it("answers the data in the envelope, never cached", async () => {
    const response = jsonOk({ id: "item-1" });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      success: true,
      data: { id: "item-1" },
      error: null,
    });
  });

  it("keeps the caller's status and headers, and still adds no-store", () => {
    const response = jsonOk(null, {
      status: 201,
      headers: { "Cache-Control": "public, max-age=60", "X-Probe": "1" },
    });

    expect(response.status).toBe(201);
    expect(response.headers.get("X-Probe")).toBe("1");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});

describe("jsonError", () => {
  it("answers the message in the envelope, with the status and headers", async () => {
    const response = jsonError("Too many searches", 429, {
      "Retry-After": "30",
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      success: false,
      data: null,
      error: "Too many searches",
    });
  });
});
