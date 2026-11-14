import { beforeEach, describe, expect, it, vi } from "vitest";

const set = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ set }),
}));

import { POST } from "@/app/api/locale/route";

const URL = "http://localhost:3000/api/locale";

function request(body: string, headers: Record<string, string> = {}) {
  return new Request(URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
    body,
  });
}

describe("POST /api/locale", () => {
  beforeEach(() => {
    set.mockReset();
  });

  it("sets the language cookie for a year and answers 204", async () => {
    const response = await POST(request(JSON.stringify({ locale: "de" })));

    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(set).toHaveBeenCalledWith(
      "devstash-locale",
      "de",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        maxAge: 365 * 24 * 60 * 60,
        path: "/",
      }),
    );
  });

  // A foreign page can post a form (text/plain) without a preflight.
  it("refuses a body that is not JSON with 415", async () => {
    const response = await POST(
      request(JSON.stringify({ locale: "de" }), {
        "content-type": "text/plain",
      }),
    );

    expect(response.status).toBe(415);
    expect(set).not.toHaveBeenCalled();
  });

  it("refuses a request the browser marks as cross-site with 403", async () => {
    const response = await POST(
      request(JSON.stringify({ locale: "de" }), {
        "sec-fetch-site": "cross-site",
      }),
    );

    expect(response.status).toBe(403);
    expect(set).not.toHaveBeenCalled();
  });

  it.each([
    ["broken JSON", "{", "invalidRequest"],
    ["an unknown language", JSON.stringify({ locale: "fr" }), "invalidInput"],
  ])("refuses %s with 400 and its code", async (_case, body, code) => {
    const response = await POST(request(body));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      success: false,
      error: code,
    });
    expect(set).not.toHaveBeenCalled();
  });
});
