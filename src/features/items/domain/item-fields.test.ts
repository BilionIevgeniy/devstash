import { describe, expect, it } from "vitest";
import {
  editableFields,
  parseTagInput,
} from "@/features/items/domain/item-fields";

describe("editableFields", () => {
  it.each([
    ["snippet", { content: true, language: true, url: false }],
    ["command", { content: true, language: true, url: false }],
    ["prompt", { content: true, language: false, url: false }],
    ["note", { content: true, language: false, url: false }],
    ["link", { content: false, language: false, url: true }],
    ["file", { content: false, language: false, url: false }],
    ["image", { content: false, language: false, url: false }],
  ])("gives the fields of a %s", (typeName, fields) => {
    expect(editableFields(typeName)).toEqual(fields);
  });

  it("gives no type-specific fields to a type it does not know", () => {
    expect(editableFields("recipe")).toEqual({
      content: false,
      language: false,
      url: false,
    });
  });
});

describe("parseTagInput", () => {
  it("splits on commas and trims each tag", () => {
    expect(parseTagInput(" react ,hooks,  state ")).toEqual([
      "react",
      "hooks",
      "state",
    ]);
  });

  it("drops empty and whitespace-only entries", () => {
    expect(parseTagInput("react, , ,hooks,")).toEqual(["react", "hooks"]);
  });

  it("keeps the first of each duplicate", () => {
    expect(parseTagInput("react, hooks, react")).toEqual(["react", "hooks"]);
  });

  it("returns an empty list for an empty or blank input", () => {
    expect(parseTagInput("")).toEqual([]);
    expect(parseTagInput("  ,  ")).toEqual([]);
  });
});
