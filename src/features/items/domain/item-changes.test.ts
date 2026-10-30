import { describe, expect, it } from "vitest";
import {
  hasItemChanges,
  type ItemFormValues,
} from "@/features/items/domain/item-changes";
import { editableFields } from "@/features/items/domain/item-fields";

const snippet = editableFields("snippet");

const initial: ItemFormValues = {
  title: "useDebounce",
  description: "Debounce a value",
  content: "  const x = 1;\n",
  language: "typescript",
  url: "",
  tags: "react, hooks",
};

function changed(patch: Partial<ItemFormValues>, fields = snippet) {
  return hasItemChanges(fields, initial, { ...initial, ...patch });
}

describe("hasItemChanges", () => {
  it("sees no change in an untouched form", () => {
    expect(changed({})).toBe(false);
  });

  it("sees no change when an edit is typed back to the original", () => {
    expect(changed({ title: "useDebounce" })).toBe(false);
  });

  it.each([
    ["title", { title: "useThrottle" }],
    ["description", { description: "" }],
    ["content", { content: "const x = 2;" }],
    ["language", { language: "javascript" }],
    ["tags", { tags: "react" }],
  ])("sees a change of the %s", (_field, patch) => {
    expect(changed(patch)).toBe(true);
  });

  it("ignores spaces around title, description and language", () => {
    expect(
      changed({
        title: "  useDebounce ",
        description: "Debounce a value  ",
        language: " typescript",
      }),
    ).toBe(false);
  });

  it("counts indentation in the content as a change", () => {
    expect(changed({ content: "const x = 1;\n" })).toBe(true);
  });

  it("treats blank content as equal to empty content", () => {
    const empty = { ...initial, content: "" };
    expect(hasItemChanges(snippet, empty, { ...empty, content: "  \n" })).toBe(
      false,
    );
  });

  it("ignores the order, spacing, empty entries and duplicates of tags", () => {
    expect(changed({ tags: " hooks ,react, ,react" })).toBe(false);
  });

  it("ignores a field the type does not have", () => {
    expect(changed({ url: "https://example.com" })).toBe(false);
    expect(changed({ content: "new" }, editableFields("link"))).toBe(false);
  });

  it("sees a change of the URL of a link", () => {
    expect(changed({ url: "https://example.com" }, editableFields("link"))).toBe(
      true,
    );
  });
});
