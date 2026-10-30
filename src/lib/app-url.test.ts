import { afterEach, describe, expect, it, vi } from "vitest";

import { getAppOrigin } from "@/lib/app-url";

describe("getAppOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("takes only the origin of the configured APP_URL", () => {
    vi.stubEnv("APP_URL", "https://devstash.example.com/some/path?x=1");

    expect(getAppOrigin()).toBe("https://devstash.example.com");
  });

  it("falls back to localhost outside production", () => {
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("NODE_ENV", "development");

    expect(getAppOrigin()).toBe("http://localhost:3000");
  });

  // Emailed links carry secret tokens: production never guesses an origin.
  it("throws in production without APP_URL", () => {
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("NODE_ENV", "production");

    expect(() => getAppOrigin()).toThrow("APP_URL is not set");
  });
});
