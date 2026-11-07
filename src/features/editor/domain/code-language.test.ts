import { describe, expect, it } from "vitest";
import {
  EDITOR_LANGUAGES,
  PLAIN_TEXT_LANGUAGE,
  editorLanguage,
  languageLabel,
  languageOption,
} from "@/features/editor/domain/code-language";

describe("EDITOR_LANGUAGES", () => {
  it("starts with Plain text", () => {
    expect(EDITOR_LANGUAGES[0].id).toBe(PLAIN_TEXT_LANGUAGE);
  });

  it("never gives one name to two languages", () => {
    const names = EDITOR_LANGUAGES.flatMap((language) => [
      language.id,
      ...language.aliases,
    ]);
    expect(new Set(names).size).toBe(names.length);
  });

  it("keeps ids and aliases lowercase, as the lookup expects", () => {
    for (const language of EDITOR_LANGUAGES) {
      for (const name of [language.id, ...language.aliases]) {
        expect(name).toBe(name.toLowerCase());
      }
    }
  });
});

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

describe("languageOption", () => {
  it.each([null, "", "   "])("checks Plain text for %j", (language) => {
    expect(languageOption(language)).toBe(PLAIN_TEXT_LANGUAGE);
  });

  it.each([
    ["typescript", "typescript"],
    ["  TS ", "typescript"],
    ["bash", "shell"],
  ])("checks the option of %j", (language, id) => {
    expect(languageOption(language)).toBe(id);
  });

  it("checks nothing for free text no option matches", () => {
    expect(languageOption("elixir")).toBeNull();
  });
});

describe("languageLabel", () => {
  it.each([
    ["typescript", "TypeScript"],
    ["bash", "Shell"],
    [" C# ", "C#"],
  ])("names %j %j", (language, label) => {
    expect(languageLabel(language)).toBe(label);
  });

  it.each([null, "", "   "])("names %j Plain text", (language) => {
    expect(languageLabel(language)).toBe("Plain text");
  });

  it("keeps free text no option matches, trimmed", () => {
    expect(languageLabel("  Elixir ")).toBe("Elixir");
  });
});
