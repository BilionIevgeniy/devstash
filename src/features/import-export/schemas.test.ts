import { describe, expect, it } from "vitest";

import {
  parseImportedCollection,
  parseImportedItem,
  parseImportFile,
} from "@/features/import-export/schemas";

const file = (fields: object) =>
  JSON.stringify({ version: 1, collections: [], items: [], ...fields });

describe("parseImportFile", () => {
  it("takes an export and leaves its records unchecked", () => {
    const parsed = parseImportFile(
      file({ items: [{ title: "x".repeat(500) }] }),
    );
    expect(parsed.success).toBe(true);
  });

  it("refuses text that is not JSON", () => {
    expect(parseImportFile("{oops")).toEqual({
      success: false,
      data: null,
      error: "invalidJson",
    });
  });

  it("names a version it cannot read, even when the shape changed", () => {
    expect(parseImportFile(JSON.stringify({ version: 2, data: {} }))).toEqual({
      success: false,
      data: null,
      error: "unsupportedExportVersion",
    });
  });

  it("refuses a file that is not an export", () => {
    expect(parseImportFile("[1, 2]").success).toBe(false);
    expect(parseImportFile(file({ items: "none" }))).toEqual({
      success: false,
      data: null,
      error: "notAnExport",
    });
  });

  it("refuses more items than a file may hold", () => {
    const items = Array.from({ length: 10_001 }, () => ({}));
    expect(parseImportFile(file({ items }))).toEqual({
      success: false,
      data: null,
      error: "importTooManyItems",
      params: { max: 10_000 },
    });
  });
});

describe("parseImportedItem", () => {
  const snippet = {
    id: "i1",
    type: "snippet",
    title: " useDebounce ",
    content: "code",
    language: "ts",
    tags: ["react"],
    collectionIds: [],
    isFavorite: true,
  };

  it("checks a record with the create rules", () => {
    expect(parseImportedItem(snippet)).toMatchObject({
      kind: "ok",
      data: { typeName: "snippet", title: "useDebounce", tags: ["react"] },
    });
  });

  it("fails one record on its own rule, in its words", () => {
    expect(parseImportedItem({ ...snippet, title: "" })).toEqual({
      kind: "invalid",
      reason: { error: "titleRequired" },
    });
    expect(parseImportedItem({ ...snippet, type: " " })).toEqual({
      kind: "invalid",
      reason: { error: "unknownItemType" },
    });
  });

  it("passes a custom type's name on to the create, which finds it", () => {
    expect(parseImportedItem({ ...snippet, type: "Recipes" })).toMatchObject({
      kind: "ok",
      data: { typeName: "Recipes" },
    });
  });

  it("reads the AI marks of a record (ADR 0027)", () => {
    const marked = {
      ...snippet,
      aiGenerated: { description: false, content: true, tags: ["react"] },
    };
    expect(parseImportedItem(marked)).toMatchObject({
      kind: "ok",
      data: {
        aiGenerated: { description: false, content: true, tags: ["react"] },
      },
    });
  });

  it("imports a record without marks, or with malformed ones, as not marked", () => {
    const none = { description: false, content: false, tags: [] };
    expect(parseImportedItem(snippet)).toMatchObject({
      kind: "ok",
      data: { aiGenerated: none },
    });
    expect(
      parseImportedItem({
        ...snippet,
        aiGenerated: {
          description: "yes",
          content: 1,
          tags: [3, "x".repeat(99)],
        },
      }),
    ).toMatchObject({ kind: "ok", data: { aiGenerated: none } });
    expect(parseImportedItem({ ...snippet, aiGenerated: "all" })).toMatchObject(
      { kind: "ok", data: { aiGenerated: none } },
    );
  });

  it("counts a file or image apart, never as a link", () => {
    expect(parseImportedItem({ type: "image", title: "Diagram" })).toEqual({
      kind: "file",
    });
  });
});

describe("parseImportedCollection", () => {
  it("needs the exported id to link the items", () => {
    expect(parseImportedCollection({ name: "React" }).kind).toBe("invalid");
    expect(
      parseImportedCollection({ id: "c1", name: " React ", description: "" }),
    ).toEqual({
      kind: "ok",
      data: { id: "c1", name: "React", description: null },
    });
  });
});
