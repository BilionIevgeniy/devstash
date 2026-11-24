import { describe, expect, it } from "vitest";
import {
  sortBySystemOrder,
  systemTypeNameForSlug,
  systemTypeSlug,
  toItemTypeInfo,
  typeLabel,
  typePagePath,
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
      toItemTypeInfo({
        id: "t1",
        name: "snippet",
        slug: "snippets",
        icon: "Code",
        color: "#3b82f6",
      }),
    ).toEqual({
      id: "t1",
      name: "snippet",
      slug: "snippets",
      icon: "Code",
      color: "#3b82f6",
    });
  });

  it("falls back to the File icon when the row has none", () => {
    expect(
      toItemTypeInfo({
        id: "t1",
        name: "custom",
        slug: "customs",
        icon: null,
        color: "#fff",
      }).icon,
    ).toBe("File");
  });

  it("turns a missing color into undefined", () => {
    expect(
      toItemTypeInfo({
        id: "t1",
        name: "custom",
        slug: "customs",
        icon: "Code",
        color: null,
      }).color,
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
    const types = ["zeta", "link", "alpha", "snippet"].map((name) => ({
      name,
    }));
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

describe("systemTypeSlug", () => {
  it("is the plural of the type name, as the migration backfilled it", () => {
    expect(systemTypeSlug("snippet")).toBe("snippets");
    expect(systemTypeSlug("link")).toBe("links");
  });
});

describe("systemTypeNameForSlug", () => {
  it.each(SYSTEM_TYPES)("finds the system type %s by its slug", (name) => {
    expect(systemTypeNameForSlug(`${name}s`)).toBe(name);
  });

  it("is null for a custom type's slug", () => {
    expect(systemTypeNameForSlug("recipes")).toBeNull();
  });

  it("is null for a system name without the suffix", () => {
    expect(systemTypeNameForSlug("snippet")).toBeNull();
  });
});

describe("typeLabel", () => {
  const t = (key: string) => `<${key}>`;

  it("words a system type through the messages, singular or plural", () => {
    expect(typeLabel(t, "command", "other")).toBe("<command.other>");
    expect(typeLabel(t, "note", "one")).toBe("<note.one>");
  });

  it("shows a custom type as it is named", () => {
    expect(typeLabel(t, "Recipes", "other")).toBe("Recipes");
  });
});

describe("typePagePath", () => {
  it("is the list of the type's items", () => {
    expect(typePagePath("snippets")).toBe("/items/snippets");
  });
});
