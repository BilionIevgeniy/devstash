import { afterEach, describe, expect, it, vi } from "vitest";

import robots from "./robots";
import sitemap from "./sitemap";

const ORIGIN = "https://devstash.example.com";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sitemap", () => {
  it("lists the public pages only, absolute on the site's origin, with both homepages as alternates", () => {
    vi.stubEnv("APP_URL", `${ORIGIN}/ignored/path`);

    const entries = sitemap();

    expect(entries.map((entry) => entry.url)).toEqual([
      `${ORIGIN}/`,
      `${ORIGIN}/de`,
      `${ORIGIN}/impressum`,
      `${ORIGIN}/datenschutz`,
    ]);
    expect(entries[1].alternates?.languages).toEqual({
      en: `${ORIGIN}/`,
      de: `${ORIGIN}/de`,
    });
  });
});

describe("robots", () => {
  it("closes only the API and points to the sitemap", () => {
    vi.stubEnv("APP_URL", ORIGIN);

    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: "/api/" },
      sitemap: `${ORIGIN}/sitemap.xml`,
    });
  });
});
