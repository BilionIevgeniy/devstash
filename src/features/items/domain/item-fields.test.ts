import { describe, expect, it } from "vitest";
import {
  canCreateType,
  contentTypeFor,
  editableFields,
  isCreatableType,
  parseTagInput,
  requiresPro,
} from "@/features/items/domain/item-fields";

describe("isCreatableType", () => {
  it.each(["snippet", "prompt", "command", "note", "link", "file", "image"])(
    "accepts a %s",
    (typeName) => {
      expect(isCreatableType(typeName)).toBe(true);
    },
  );

  it.each(["recipe", ""])("rejects %j", (typeName) => {
    expect(isCreatableType(typeName)).toBe(false);
  });
});

describe("requiresPro", () => {
  it.each([
    ["file", true],
    ["image", true],
    ["snippet", false],
    ["link", false],
    ["recipe", false],
  ])("%s needs Pro: %s", (typeName, expected) => {
    expect(requiresPro(typeName)).toBe(expected);
  });
});

describe("canCreateType", () => {
  it("lets a Free user create the text types but not file or image", () => {
    expect(canCreateType("note", false)).toBe(true);
    expect(canCreateType("file", false)).toBe(false);
    expect(canCreateType("image", false)).toBe(false);
  });

  it("lets a Pro user create every type", () => {
    expect(canCreateType("image", true)).toBe(true);
  });
});

describe("contentTypeFor", () => {
  it.each([
    ["link", "URL"],
    ["snippet", "TEXT"],
    ["command", "TEXT"],
    ["prompt", "TEXT"],
    ["note", "TEXT"],
    ["file", "FILE"],
    ["image", "FILE"],
  ])("stores a %s as %s", (typeName, contentType) => {
    expect(contentTypeFor(typeName)).toBe(contentType);
  });
});

describe("editableFields", () => {
  const none = {
    content: false,
    codeEditor: false,
    language: false,
    url: false,
    file: null,
  };

  it.each([
    ["snippet", { ...none, content: true, codeEditor: true, language: true }],
    ["command", { ...none, content: true, codeEditor: true, language: true }],
    ["prompt", { ...none, content: true }],
    ["note", { ...none, content: true }],
    ["link", { ...none, url: true }],
    ["file", { ...none, file: "file" }],
    ["image", { ...none, file: "image" }],
  ])("gives the fields of a %s", (typeName, fields) => {
    expect(editableFields(typeName)).toEqual(fields);
  });

  it("gives no type-specific fields to a type it does not know", () => {
    expect(editableFields("recipe")).toEqual(none);
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
