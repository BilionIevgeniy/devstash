import { describe, expect, it } from "vitest";

import {
  itemDuplicateKey,
  recordLabel,
  remapCollectionIds,
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
