import { describe, expect, it } from "vitest";
import {
  collectionChoices,
  collectionSummary,
  NO_COLLECTIONS_LABEL,
} from "@/features/items/domain/item-collections";

const react = { id: "col-1", name: "React" };
const python = { id: "col-2", name: "Python" };
const go = { id: "col-3", name: "Go" };

describe("collectionChoices", () => {
  it("keeps a linked collection the options do not have, so it can be unticked", () => {
    expect(collectionChoices([react], [python])).toEqual([python, react]);
  });

  it("lists a collection in both only once, under its current name", () => {
    const renamed = { ...react, name: "React Patterns" };

    expect(collectionChoices([react], [renamed])).toEqual([renamed]);
  });

  it("names the linked collections before the options arrive", () => {
    expect(collectionChoices([react], [])).toEqual([react]);
  });
});

describe("collectionSummary", () => {
  const choices = [go, python, react];

  it("asks for a choice when nothing is selected", () => {
    expect(collectionSummary(choices, [])).toBe(NO_COLLECTIONS_LABEL);
  });

  it("names a short selection", () => {
    expect(collectionSummary(choices, ["col-1", "col-3"])).toBe("Go, React");
  });

  it("counts a longer selection", () => {
    expect(collectionSummary(choices, ["col-1", "col-2", "col-3"])).toBe(
      "3 selected",
    );
  });
});
