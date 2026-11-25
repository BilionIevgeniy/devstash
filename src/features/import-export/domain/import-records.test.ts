import { describe, expect, it } from "vitest";

import {
  itemDuplicateKey,
  recordLabel,
  remapCollectionIds,
  addImportSummaries,
  emptyImportSummary,
  importedAiClaims,
  toCreateItemCandidate,
} from "@/features/import-export/domain/import-records";

describe("itemDuplicateKey", () => {
  const snippet = {
    typeName: "snippet",
    title: "useDebounce",
    content: "ts version",
    url: null,
  };

  it("keeps two snippets with one title and different code apart", () => {
    expect(itemDuplicateKey(snippet)).not.toBe(
      itemDuplicateKey({ ...snippet, content: "js version" }),
    );
  });

  it("matches the same item, and tells types apart", () => {
    expect(itemDuplicateKey({ ...snippet })).toBe(itemDuplicateKey(snippet));
    expect(itemDuplicateKey({ ...snippet, typeName: "note" })).not.toBe(
      itemDuplicateKey(snippet),
    );
  });

  it("ignores a field the type does not store", () => {
    const link = {
      typeName: "link",
      title: "Docs",
      content: null,
      url: "https://a.dev",
    };
    expect(itemDuplicateKey({ ...link, content: "stray" })).toBe(
      itemDuplicateKey(link),
    );
  });
});

describe("remapCollectionIds", () => {
  it("points the ids at this account's collections and drops unknown ones", () => {
    const record = {
      title: "A",
      collectionIds: ["old-1", "old-2", "__proto__"],
    };
    expect(remapCollectionIds(record, { "old-1": "new-1" })).toEqual({
      title: "A",
      collectionIds: ["new-1"],
    });
  });

  it("leaves a record it cannot read for the server", () => {
    expect(remapCollectionIds("text", {})).toBe("text");
    const record = { collectionIds: "c1" };
    expect(remapCollectionIds(record, {})).toBe(record);
  });
});

describe("recordLabel", () => {
  it("uses the title or name, else the stand-in", () => {
    expect(recordLabel({ title: " Hooks " })).toBe("Hooks");
    expect(recordLabel({ name: "React" })).toBe("React");
    expect(recordLabel({ title: 4 })).toBeNull();
    expect(recordLabel(null)).toBeNull();
  });
});

describe("what an import reads of a record", () => {
  it("labels it by its title or name, trimmed", () => {
    expect(recordLabel({ title: "  Deploy " })).toBe("Deploy");
    expect(recordLabel({ name: "React" })).toBe("React");
    expect(recordLabel({ title: "  " })).toBeNull();
  });

  it("keeps at most 20 AI tags of at most 50 characters", () => {
    const tag = "x".repeat(50);
    const tags = [
      tag,
      `${tag}x`,
      5,
      ...Array.from({ length: 30 }, (_, i) => String(i)),
    ];
    const claims = importedAiClaims({ tags });
    expect(claims?.tags).toHaveLength(20);
    expect(claims?.tags[0]).toBe(tag);
    expect(claims?.tags[1]).toBe("0");
    expect(importedAiClaims({ tags: "react" })?.tags).toEqual([]);
  });

  it("keeps each field of the record and fills the missing ones", () => {
    const record = {
      type: "link",
      title: "Docs",
      description: "d",
      content: "c",
      url: "https://x.test",
      language: "ts",
      tags: ["a"],
      collectionIds: ["c1"],
    };
    expect(toCreateItemCandidate(record)).toMatchObject({
      typeName: "link",
      description: "d",
      content: "c",
      url: "https://x.test",
      language: "ts",
      tags: ["a"],
      collectionIds: ["c1"],
    });
    expect(toCreateItemCandidate({ type: "note", title: "N" })).toMatchObject({
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      collectionIds: [],
    });
  });

  it("finds a duplicate by type in any case and by the text its type stores", () => {
    const link = {
      typeName: "link",
      title: "Docs",
      content: null,
      url: "https://a.test",
    };
    const key = itemDuplicateKey(link);
    expect(itemDuplicateKey({ ...link, url: "https://b.test" })).not.toBe(key);
    const custom = { typeName: "Recipe", title: "R", content: "x", url: null };
    expect(itemDuplicateKey({ ...custom, typeName: "recipe" })).toBe(
      itemDuplicateKey(custom),
    );
    const note = { typeName: "note", title: "N", content: "x", url: null };
    expect(itemDuplicateKey({ ...note, url: "https://a.test" })).toBe(
      itemDuplicateKey(note),
    );
  });

  it("adds every count of two batches", () => {
    const failed = (title: string) => ({
      title,
      reason: { error: "enterName" as const },
    });
    expect(
      addImportSummaries(
        { created: 1, duplicates: 2, files: 3, failed: [failed("A")] },
        { created: 10, duplicates: 20, files: 30, failed: [failed("B")] },
      ),
    ).toEqual({
      created: 11,
      duplicates: 22,
      files: 33,
      failed: [failed("A"), failed("B")],
    });
    expect(emptyImportSummary().duplicates).toBe(0);
  });
});
