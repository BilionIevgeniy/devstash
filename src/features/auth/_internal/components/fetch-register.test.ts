import { afterEach, describe, expect, it, vi } from "vitest";

import { postRegistration } from "@/features/auth/_internal/components/fetch-register";

const VALUES = { email: "ada@example.com", password: "my-password-1" };

function answer(body: unknown, status = 200) {
  return Promise.resolve(Response.json(body, { status }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("postRegistration", () => {
  it("posts the values as JSON to the registration route", async () => {
    const fetchMock = vi.fn(() =>
      answer({ success: true, data: null, error: null }, 201),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await postRegistration(VALUES);

    expect(result).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALUES),
    });
  });

  it("returns the code and params the route answered", async () => {
    vi.stubGlobal("fetch", () =>
      answer(
        {
          success: false,
          data: null,
          error: "tooManyAttempts",
          params: { minutes: 3 },
        },
        429,
      ),
    );

    expect(await postRegistration(VALUES)).toEqual({
      success: false,
      data: null,
      error: "tooManyAttempts",
      params: { minutes: 3 },
    });
  });

  it("reads a failure with no text as a generic error", async () => {
    vi.stubGlobal("fetch", () =>
      answer({ success: false, data: null, error: null }, 500),
    );

    expect(await postRegistration(VALUES)).toEqual({
      success: false,
      data: null,
      error: "generic",
    });
  });

  it("reads a network failure as a generic error", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("offline")));

    expect(await postRegistration(VALUES)).toEqual({
      success: false,
      data: null,
      error: "generic",
    });
  });

  it("reads an answer that is not JSON as a generic error", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(
        new Response("<html>Bad gateway</html>", { status: 502 }),
      ),
    );

    expect(await postRegistration(VALUES)).toEqual({
      success: false,
      data: null,
      error: "generic",
    });
  });
});
