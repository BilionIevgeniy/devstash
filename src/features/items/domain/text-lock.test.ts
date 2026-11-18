import { describe, expect, it } from "vitest";

import { editableFields } from "@/features/items/domain/item-fields";
import { changesOnlyCollections } from "@/features/items/domain/text-lock";

const SNIPPET = editableFields("snippet");
const STORED = {
  title: "Debounce",
  description: null,
  content: "const x = 1;",
  language: "typescript",
  url: null,
  tags: ["React", "hooks"],
};

describe("changesOnlyCollections", () => {
  it("passes a save that sends the stored text back", () => {
    expect(changesOnlyCollections(SNIPPET, STORED, { ...STORED })).toBe(true);
  });

  it("passes tags in another order or case", () => {
    expect(
      changesOnlyCollections(SNIPPET, STORED, {
        ...STORED,
        tags: ["Hooks", "react"],
      }),
    ).toBe(true);
  });

  it.each([
    ["title", { title: "Throttle" }],
    ["description", { description: "new" }],
    ["content", { content: "const x = 2;" }],
    ["language", { language: "javascript" }],
    ["tags", { tags: ["React"] }],
  ])("refuses a changed %s", (_field, change) => {
    expect(
      changesOnlyCollections(SNIPPET, STORED, { ...STORED, ...change }),
    ).toBe(false);
  });

  it("refuses a changed URL of a link", () => {
    const link = {
      ...STORED,
      content: null,
      language: null,
      url: "https://a.test",
    };
    expect(
      changesOnlyCollections(editableFields("link"), link, {
        ...link,
        url: "https://b.test",
      }),
    ).toBe(false);
  });

  it("ignores a field the update leaves out", () => {
    expect(
      changesOnlyCollections(SNIPPET, STORED, {
        title: STORED.title,
        tags: STORED.tags,
      }),
    ).toBe(true);
  });
});
