import { describe, expect, it } from "vitest";
import {
  PLAIN_TEXT_LANGUAGE,
  editorLanguage,
} from "@/features/editor/_internal/domain/code-language";

describe("editorLanguage", () => {
  it.each([
    ["typescript", "typescript"],
    ["python", "python"],
    ["yaml", "yaml"],
    ["sql", "sql"],
  ])("keeps the editor id %s", (language, id) => {
    expect(editorLanguage(language)).toBe(id);
  });

  it.each([
    ["bash", "shell"],
    ["zsh", "shell"],
    ["tsx", "typescript"],
    ["py", "python"],
    ["yml", "yaml"],
    ["c++", "cpp"],
    ["postgresql", "sql"],
  ])("maps the alias %s to %s", (language, id) => {
    expect(editorLanguage(language)).toBe(id);
  });

  it("ignores case and surrounding spaces", () => {
    expect(editorLanguage("  TypeScript ")).toBe("typescript");
    expect(editorLanguage("BASH")).toBe("shell");
  });

  it.each([null, "", "   ", "brainfuck"])(
    "shows %j as plain text",
    (language) => {
      expect(editorLanguage(language)).toBe(PLAIN_TEXT_LANGUAGE);
    },
  );
});
