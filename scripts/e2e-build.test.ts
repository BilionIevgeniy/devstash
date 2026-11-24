import { describe, expect, it } from "vitest";
import { APP_PAGE_EXTENSIONS, pageExtensionsFor } from "./e2e-build";

describe("pageExtensionsFor", () => {
  it("compiles no throw route outside the end-to-end build", () => {
    expect(pageExtensionsFor({})).toEqual(APP_PAGE_EXTENSIONS);
    expect(pageExtensionsFor({ E2E_BUILD: "true" })).toEqual(
      APP_PAGE_EXTENSIONS,
    );
    expect(APP_PAGE_EXTENSIONS.join()).not.toContain("e2e");
  });

  it("adds the throw routes for the end-to-end build", () => {
    expect(pageExtensionsFor({ E2E_BUILD: "1" })).toContain("e2e.tsx");
  });

  it("refuses them on Vercel", () => {
    expect(() => pageExtensionsFor({ E2E_BUILD: "1", VERCEL: "1" })).toThrow(
      "E2E_BUILD must never be set on a Vercel deployment",
    );
  });
});
