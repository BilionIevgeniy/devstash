import { describe, expect, it } from "vitest";

import { createPaletteSearch } from "@/features/search/_internal/components/fuzzy-search";
import type { IndexedItem } from "@/features/search/types";

function item(id: string, fields: Partial<IndexedItem> = {}): IndexedItem {
  return {
    id,
    title: id,
    description: null,
    isFavorite: false,
    isPinned: false,
    createdAt: new Date("2026-01-01"),
    tags: [],
    type: { id: "type-1", name: "snippet", icon: "Code" },
    preview: null,
    isLocked: false,
    ...fields,
  };
}

function collection(id: string, name: string) {
  return { id, name, itemCount: 1 };
}

const ids = (list: { id: string }[]) => list.map(({ id }) => id);

describe("createPaletteSearch", () => {
  it("finds a title despite a typo", () => {
    const search = createPaletteSearch({
      items: [
        item("hook", { title: "useDebounce hook" }),
        item("sql", { title: "Postgres backup" }),
      ],
      collections: [],
    });

    expect(ids(search("usedebonce").items)).toEqual(["hook"]);
  });

  it("still allows a typo in a query of five letters or more", () => {
    const search = createPaletteSearch({
      items: [
        item("notes", { title: "Meeting Notes Template" }),
        item("review", { title: "Code Review Prompt" }),
      ],
      collections: [],
    });

    expect(ids(search("meting").items)).toEqual(["notes"]);
    expect(ids(search("reviw").items)).toEqual(["review"]);
  });

  it("does not take a near miss for a short query", () => {
    const search = createPaletteSearch({
      items: [
        item("notes", {
          title: "Meeting Notes Template",
          tags: ["template"],
          description: "Markdown template with decisions",
        }),
        item("hook", {
          title: "useAuth Hook",
          preview: "import { useContext, useEffect, useState } from 'react'",
        }),
        item("real", { title: "Vitest setup" }),
      ],
      collections: [collection("files", "Context Files")],
    });

    const results = search("test");

    expect(ids(results.items)).toEqual(["real"]);
    expect(results.collections).toEqual([]);
  });

  it("finds a match late in a long preview", () => {
    const search = createPaletteSearch({
      items: [item("late", { preview: `${"x ".repeat(55)}kubectl` })],
      collections: [],
    });

    expect(ids(search("kubectl").items)).toEqual(["late"]);
  });

  it("searches tags, the type and the description", () => {
    const search = createPaletteSearch({
      items: [
        item("tagged", { tags: ["typescript"] }),
        item("typed", { type: { id: "t", name: "prompt", icon: "Sparkles" } }),
        item("described", { description: "Deploy to staging" }),
      ],
      collections: [],
    });

    expect(ids(search("typescript").items)).toEqual(["tagged"]);
    expect(ids(search("prompt").items)).toEqual(["typed"]);
    expect(ids(search("staging").items)).toEqual(["described"]);
  });

  it("ranks a title match above a preview match", () => {
    const search = createPaletteSearch({
      items: [
        item("in-preview", { title: "Other", preview: "docker compose up" }),
        item("in-title", { title: "docker" }),
      ],
      collections: [],
    });

    expect(ids(search("docker").items)[0]).toBe("in-title");
  });

  it("keeps items and collections in their own groups", () => {
    const search = createPaletteSearch({
      items: [item("item", { title: "React hooks" })],
      collections: [collection("col", "React patterns")],
    });

    const results = search("react");

    expect(ids(results.items)).toEqual(["item"]);
    expect(ids(results.collections)).toEqual(["col"]);
  });

  it("caps the results of each group", () => {
    const search = createPaletteSearch({
      items: Array.from({ length: 20 }, (_, i) =>
        item(`item-${i}`, { title: "react" }),
      ),
      collections: Array.from({ length: 20 }, (_, i) =>
        collection(`col-${i}`, "react"),
      ),
    });

    const results = search("react");

    expect(results.items).toHaveLength(8);
    expect(results.collections).toHaveLength(5);
  });

  it("shows the latest of each group for an empty query, in index order", () => {
    const items = Array.from({ length: 20 }, (_, i) => item(`item-${i}`));
    const search = createPaletteSearch({ items, collections: [] });

    expect(ids(search("   ").items)).toEqual(ids(items.slice(0, 8)));
  });

  it("finds nothing for text no item resembles", () => {
    const search = createPaletteSearch({
      items: [item("hook", { title: "useDebounce hook" })],
      collections: [collection("col", "React patterns")],
    });

    expect(search("zzzzqqqq")).toEqual({ items: [], collections: [] });
  });
});
