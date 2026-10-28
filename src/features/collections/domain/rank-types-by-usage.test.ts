import { describe, expect, it } from "vitest";
import { rankTypesByUsage } from "@/features/collections/domain/rank-types-by-usage";
import type { ItemTypeInfo } from "@/features/item-types/types";

function makeType(id: string, name: string): ItemTypeInfo {
  return { id, name, icon: "File" };
}

function indexById(...types: ItemTypeInfo[]): Map<string, ItemTypeInfo> {
  return new Map(types.map((type) => [type.id, type]));
}

const SNIPPET = makeType("t-snippet", "snippet");
const NOTE = makeType("t-note", "note");
const LINK = makeType("t-link", "link");
const COMMAND = makeType("t-command", "command");
const PROMPT = makeType("t-prompt", "prompt");

const names = (types: ItemTypeInfo[]) => types.map((type) => type.name);

describe("rankTypesByUsage", () => {
  it("puts the most used type first", () => {
    const typesById = indexById(SNIPPET, NOTE, LINK);
    const ranked = rankTypesByUsage(
      ["t-note", "t-snippet", "t-snippet", "t-snippet", "t-note", "t-link"],
      typesById,
    );
    expect(names(ranked)).toEqual(["snippet", "note", "link"]);
  });

  it("orders types with the same count by name", () => {
    const typesById = indexById(PROMPT, COMMAND, NOTE);
    const ranked = rankTypesByUsage(["t-prompt", "t-command", "t-note"], typesById);
    expect(names(ranked)).toEqual(["command", "note", "prompt"]);
  });

  it("orders by name only inside a group with the same count", () => {
    const typesById = indexById(SNIPPET, NOTE, LINK);
    const ranked = rankTypesByUsage(
      ["t-snippet", "t-snippet", "t-note", "t-note", "t-link"],
      typesById,
    );
    expect(names(ranked)).toEqual(["note", "snippet", "link"]);
  });

  it("lists a type once however often it is used", () => {
    const ranked = rankTypesByUsage(
      ["t-note", "t-note", "t-note"],
      indexById(NOTE),
    );
    expect(ranked).toHaveLength(1);
  });

  it("skips type ids that have no type", () => {
    const ranked = rankTypesByUsage(
      ["t-ghost", "t-ghost", "t-ghost", "t-note"],
      indexById(NOTE),
    );
    expect(names(ranked)).toEqual(["note"]);
  });

  it("returns the type objects it was given", () => {
    const [first] = rankTypesByUsage(["t-note"], indexById(NOTE));
    expect(first).toBe(NOTE);
  });

  it("returns an empty list when nothing is used", () => {
    expect(rankTypesByUsage([], indexById(NOTE))).toEqual([]);
  });
});
