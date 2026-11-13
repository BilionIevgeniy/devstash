import { describe, expect, it, vi } from "vitest";
import { createTranslator } from "next-intl";

import { LOCALES } from "@/i18n/config";
import { messagesFor } from "@/i18n/messages";

type Tree = { [key: string]: string | Tree };

// "a.b.c" for every message of a namespace tree.
function keysOf(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string"
      ? [`${prefix}${key}`]
      : keysOf(value, `${prefix}${key}.`),
  );
}

function messageAt(tree: Tree, path: string): string {
  return path
    .split(".")
    .reduce<Tree | string>((node, key) => (node as Tree)[key], tree) as string;
}

const english = messagesFor("en") as unknown as Tree;

describe("the German messages", () => {
  const german = messagesFor("de") as unknown as Tree;

  it("have exactly the keys of the English ones, namespace by namespace", () => {
    expect(Object.keys(german).sort()).toEqual(Object.keys(english).sort());
    for (const namespace of Object.keys(english)) {
      expect(keysOf(german[namespace] as Tree).sort(), namespace).toEqual(
        keysOf(english[namespace] as Tree).sort(),
      );
    }
  });

  it("are translated, not copied: at most a few match the English word for word", () => {
    const same = keysOf(english).filter(
      (key) => messageAt(english, key) === messageAt(german, key),
    );
    // Names and loanwords stay as they are (DevStash, Pro, Snippet, GitHub).
    expect(same.length / keysOf(english).length).toBeLessThan(0.15);
  });
});

describe.each(LOCALES)("every %s message", (locale) => {
  const messages = messagesFor(locale) as unknown as Tree;

  it.each(keysOf(messages))("formats %s with sample params", (key) => {
    const onError = vi.fn();
    const translate = createTranslator({
      locale,
      messages,
      onError,
      timeZone: "Europe/Berlin",
    });
    const message = messageAt(messages, key);
    const names = [...message.matchAll(/\{(\w+)/g)].map(([, name]) => name);
    const tags = [...message.matchAll(/<(\w+)>/g)].map(([, tag]) => tag);
    const params = Object.fromEntries([
      ...names.map((name) => [name, 2]),
      ...tags.map((tag) => [tag, (chunks: string) => chunks]),
    ]);

    // A message with tags (<strong>) is formatted as markup, like t.rich.
    const format = (tags.length > 0 ? translate.markup : translate) as (
      key: string,
      values: object,
    ) => string;
    const text = format(key, params);

    expect(onError).not.toHaveBeenCalled();
    expect(text).not.toMatch(/[{}]/);
  });
});
