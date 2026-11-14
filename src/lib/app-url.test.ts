import { afterEach, describe, expect, it, vi } from "vitest";

import { getAppOrigin, getSiteOrigin } from "@/lib/app-url";

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

describe("getSiteOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("takes the configured APP_URL first", () => {
    vi.stubEnv("APP_URL", "https://devstash.example.com/path");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "devstash.vercel.app");

    expect(getSiteOrigin()).toBe("https://devstash.example.com");
  });

  // A preview build has no APP_URL and must not fail.
  it("falls back to Vercel's production domain in production", () => {
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "devstash.example.com");

    expect(getSiteOrigin()).toBe("https://devstash.example.com");
  });

  it("falls back to localhost when neither is set", () => {
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");

    expect(getSiteOrigin()).toBe("http://localhost:3000");
  });
});
