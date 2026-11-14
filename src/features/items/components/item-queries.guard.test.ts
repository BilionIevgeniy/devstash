import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The browser caches item data (ADR 0025), so every client caller of an action
// that changes items or collections must make the cache follow the success.
// A heuristic over imports, not a proof: it only sees that the cache helpers
// are imported, not that they are awaited in the right place.
const ACTION_IMPORT =
  /from "@\/features\/(items|collections|import-export)\/actions\//;
const SYNC_IMPORT =
  /from "@\/features\/items\/components\/(item-queries|hooks\/use-item-queries)"/;

// A file that imports an action and needs no sync of its own, with the reason.
const NO_SYNC_NEEDED: Record<string, string> = {
  "src/features/import-export/_internal/components/run-import.ts":
    "a plain helper; use-import syncs once the whole run has ended",
  "src/features/collections/_internal/components/hooks/use-collection-favorite.ts":
    "a collection's star; no cached item data holds it",
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    const isSource = /\.tsx?$/.test(entry.name);
    const isTest = /\.test\.tsx?$/.test(entry.name);
    return isSource && !isTest ? [path] : [];
  });
}

describe("item cache sync", () => {
  const callers = sourceFiles("src")
    .filter((path) => !path.includes("/actions/"))
    .filter((path) => ACTION_IMPORT.test(readFileSync(path, "utf8")));

  it("finds the callers it guards", () => {
    expect(callers.length).toBeGreaterThan(5);
  });

  it.each(callers)("%s makes the cache follow its action", (path) => {
    if (path in NO_SYNC_NEEDED) return;
    expect(SYNC_IMPORT.test(readFileSync(path, "utf8"))).toBe(true);
  });

  it("names only callers that exist, each with a reason", () => {
    for (const [path, reason] of Object.entries(NO_SYNC_NEEDED)) {
      expect(callers).toContain(path);
      expect(reason.length).toBeGreaterThan(10);
    }
  });
});
