import { describe, expect, it } from "vitest";

import { assertOperatorComplete, findPlaceholders } from "./operator-guard";

const FILLED = { name: "A B", addressLines: ["Street 1", "12345 Town"] };
const DRAFT = {
  name: "A B",
  addressLines: ["⟦OPERATOR: street⟧", "12345 Town"],
  phone: "⟦OPERATOR: phone⟧",
};

describe("findPlaceholders", () => {
  it("names every fact that still holds a placeholder, in lists too", () => {
    expect(findPlaceholders(DRAFT)).toEqual(["addressLines", "phone"]);
  });

  it("finds nothing in complete facts", () => {
    expect(findPlaceholders(FILLED)).toEqual([]);
  });

  it("ignores a fact that is not set", () => {
    expect(findPlaceholders({ vatId: undefined })).toEqual([]);
  });
});

describe("assertOperatorComplete", () => {
  it("fails a production build while a placeholder is left", () => {
    expect(() => assertOperatorComplete(DRAFT, "production")).toThrow(
      /addressLines, phone/,
    );
  });

  it("lets a preview and a local build through, where drafts are read", () => {
    expect(() => assertOperatorComplete(DRAFT, "preview")).not.toThrow();
    expect(() => assertOperatorComplete(DRAFT, undefined)).not.toThrow();
  });

  it("lets a complete production build through", () => {
    expect(() => assertOperatorComplete(FILLED, "production")).not.toThrow();
  });
});
