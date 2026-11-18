import { beforeEach, describe, expect, it, vi } from "vitest";

const { info, consumeLocalRateLimit } = vi.hoisted(() => ({
  info: vi.fn(),
  consumeLocalRateLimit: vi.fn(),
}));
vi.mock("@/lib/observability/logger", () => ({
  logger: { info, warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/vendors/local-rate-limit", () => ({ consumeLocalRateLimit }));

import { POST } from "@/app/api/vitals/route";

const LCP = { name: "LCP", value: 1800, group: "/items/[type]" };

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/vitals", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      "x-forwarded-for": "203.0.113.7",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/vitals", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    consumeLocalRateLimit.mockReturnValue(true);
  });

  it("logs the metric with its page group and answers 204", async () => {
    const response = await POST(request(LCP));

    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(info).toHaveBeenCalledExactlyOnceWith(
      "Web Vital LCP on /items/[type]",
      { numbers: { value: 1800 } },
    );
  });

  it("refuses a body it does not know, and logs nothing", async () => {
    const forged = await POST(request({ ...LCP, group: "/items/a/b?x=1" }));
    const broken = await POST(request("{"));

    expect(forged.status).toBe(400);
    expect(broken.status).toBe(400);
    expect(info).not.toHaveBeenCalled();
  });

  it("refuses another content type and a cross-site request", async () => {
    const text = await POST(request(LCP, { "content-type": "text/plain" }));
    const crossSite = await POST(
      request(LCP, { "sec-fetch-site": "cross-site" }),
    );

    expect(text.status).toBe(415);
    expect(crossSite.status).toBe(403);
    expect(info).not.toHaveBeenCalled();
  });

  it("answers 429 over the limit of the address, and logs nothing", async () => {
    consumeLocalRateLimit.mockReturnValue(false);

    const response = await POST(request(LCP));

    expect(response.status).toBe(429);
    expect(info).not.toHaveBeenCalled();
  });
});
