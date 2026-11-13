import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ERROR_PARAM_NAMES, isErrorCode } from "@/i18n/error-codes";
import errors from "@/i18n/messages/en/errors.json";

// The top-level arguments of an ICU message: `{minutes, plural, …}` gives
// "minutes"; the `{# minute}` inside a plural branch is no argument.
function argumentsOf(message: string): string[] {
  return [
    ...new Set([...message.matchAll(/\{(\w+)/g)].map(([, name]) => name)),
  ];
}

describe("ERROR_PARAM_NAMES", () => {
  const names: Record<string, readonly string[] | undefined> =
    ERROR_PARAM_NAMES;

  it.each(Object.entries(errors))(
    "lists exactly the arguments of %s, so fail() asks for each one",
    (code, message) => {
      expect([...(names[code] ?? [])].sort()).toEqual(
        argumentsOf(message).sort(),
      );
    },
  );

  it("names only codes that have a message", () => {
    for (const code of Object.keys(ERROR_PARAM_NAMES)) {
      expect(isErrorCode(code), code).toBe(true);
    }
  });
});

describe("isErrorCode", () => {
  it("knows the codes of the messages and nothing else", () => {
    expect(isErrorCode("itemNotFound")).toBe(true);
    expect(isErrorCode("Item not found")).toBe(false);
    expect(isErrorCode("toString")).toBe(false);
    expect(isErrorCode(42)).toBe(false);
  });
});

// A Zod message is a plain string to tsc, and firstIssue turns one that is not
// a code into "invalidInput", so a typo would ship silently. Every camelCase
// string of a schema file is a message; the paths of an issue are not.
describe("the messages of the schemas", () => {
  const files = readdirSync("src/features", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join("src/features", entry.name, "schemas.ts"))
    .filter((file) => existsSync(file));

  it.each(files)("are all error codes in %s", (file) => {
    const source = readFileSync(file, "utf8").replace(/path: \[[^\]]*\]/g, "");
    const literals = [...source.matchAll(/"([a-z]+[A-Z][A-Za-z]*)"/g)].map(
      ([, literal]) => literal,
    );

    expect(literals.filter((literal) => !isErrorCode(literal))).toEqual([]);
  });

  it("finds the schema files", () => {
    expect(files.length).toBeGreaterThan(5);
  });
});
