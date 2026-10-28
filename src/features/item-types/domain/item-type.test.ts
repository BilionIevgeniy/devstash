import { describe, expect, it } from "vitest";
import {
  parseTypeSlug,
  sortBySystemOrder,
  toItemTypeInfo,
  typeSlug,
} from "@/features/item-types/domain/item-type";

const SYSTEM_TYPES = [
  "snippet",
  "prompt",
  "command",
  "note",
  "file",
  "image",
  "link",
];

describe("toItemTypeInfo", () => {
  it("copies the fields of a complete row", () => {
    expect(
      toItemTypeInfo({ id: "t1", name: "snippet", icon: "Code", color: "#3b82f6" }),
    ).toEqual({ id: "t1", name: "snippet", icon: "Code", color: "#3b82f6" });
  });

  it("falls back to the File icon when the row has none", () => {
    expect(
      toItemTypeInfo({ id: "t1", name: "custom", icon: null, color: "#fff" }).icon,
    ).toBe("File");
  });

  it("turns a missing color into undefined", () => {
    expect(
      toItemTypeInfo({ id: "t1", name: "custom", icon: "Code", color: null }).color,
    ).toBeUndefined();
  });
});

describe("sortBySystemOrder", () => {
  it("puts the system types in their fixed order", () => {
    const shuffled = [...SYSTEM_TYPES].reverse().map((name) => ({ name }));
    expect(sortBySystemOrder(shuffled).map((type) => type.name)).toEqual(
      SYSTEM_TYPES,
    );
  });

  it("puts types it does not know after the system types, in their given order", () => {
    const types = ["zeta", "link", "alpha", "snippet"].map((name) => ({ name }));
    expect(sortBySystemOrder(types).map((type) => type.name)).toEqual([
      "snippet",
      "link",
      "zeta",
      "alpha",
    ]);
  });

  it("does not change the array it is given", () => {
    const types = [{ name: "link" }, { name: "snippet" }];
    sortBySystemOrder(types);
    expect(types.map((type) => type.name)).toEqual(["link", "snippet"]);
  });

  it("keeps the other fields of each type", () => {
    const sorted = sortBySystemOrder([
      { name: "note", id: "n" },
      { name: "snippet", id: "s" },
    ]);
    expect(sorted).toEqual([
      { name: "snippet", id: "s" },
      { name: "note", id: "n" },
    ]);
  });

  it("returns an empty list for an empty list", () => {
    expect(sortBySystemOrder([])).toEqual([]);
  });
});

describe("typeSlug", () => {
  it("is the plural of the type name", () => {
    expect(typeSlug("snippet")).toBe("snippets");
    expect(typeSlug("link")).toBe("links");
  });
});

describe("parseTypeSlug", () => {
  it("gives back the type name", () => {
    expect(parseTypeSlug("snippets")).toBe("snippet");
  });

  it.each(SYSTEM_TYPES)("round-trips the system type %s", (name) => {
    expect(parseTypeSlug(typeSlug(name))).toBe(name);
  });

  it("is null for a slug that is only the suffix", () => {
    expect(parseTypeSlug("s")).toBeNull();
  });

  it("is null for a slug without the suffix", () => {
    expect(parseTypeSlug("snippet")).toBeNull();
  });

  it("is null for an empty slug", () => {
    expect(parseTypeSlug("")).toBeNull();
  });
});
