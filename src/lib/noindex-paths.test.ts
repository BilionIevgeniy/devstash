import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { NOINDEX_PATHS } from "./noindex-paths";

// Read as text: importing src/proxy.ts loads next-auth, which Vitest cannot
// load, and Next needs the matcher as a literal, so it cannot import the list.
function proxyMatcherPrefixes(): string[] {
  const source = readFileSync(join(__dirname, "..", "proxy.ts"), "utf8");
  const matcher = /matcher:\s*\[([^\]]*)\]/.exec(source)?.[1] ?? "";
  return [...matcher.matchAll(/"([^"]+)"/g)].map(([, entry]) =>
    entry.replace(/\/:path\*$/, ""),
  );
}

describe("NOINDEX_PATHS", () => {
  it("covers every route the proxy guards, so no app page is indexable by header", () => {
    const prefixes = proxyMatcherPrefixes();

    expect(prefixes.length).toBeGreaterThan(0);
    expect(NOINDEX_PATHS).toEqual(expect.arrayContaining(prefixes));
  });
});
