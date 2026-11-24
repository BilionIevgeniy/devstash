import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { appMessages, messagesFor } from "@/i18n/messages";

// The app and the auth pages get every namespace but `emails` and `marketing`
// (appMessages), so a component there that asks for one would show a raw key.
// A heuristic over the source: it sees a namespace or a key written as a
// literal, also for a translator with no namespace (`t("marketing.x")`), and
// not one put together at run time. Server components are free: the request
// config keeps every namespace.
const READS_ON_THE_CLIENT = /\buseTranslations\(/;
const LEFT_OUT = /["'`](marketing|emails)(\.[A-Za-z.]+)?["'`]/;
const MARKETING = join("src", "app", "(marketing)");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    const isSource = /\.tsx?$/.test(entry.name);
    return isSource && !/\.(test|stories)\.tsx?$/.test(entry.name)
      ? [path]
      : [];
  });
}

describe("the messages of the app and the auth pages", () => {
  const readers = sourceFiles("src")
    .filter((path) => READS_ON_THE_CLIENT.test(readFileSync(path, "utf8")))
    .map((path) => ({ path, marketing: path.startsWith(MARKETING) }));

  it("leave out only what no screen there reads", () => {
    const all = Object.keys(messagesFor("en"));
    const sent = Object.keys(appMessages("en"));

    expect(all.filter((name) => !sent.includes(name))).toEqual([
      "emails",
      "marketing",
    ]);
  });

  it("recognises the components that read them", () => {
    const found = readers.filter(({ path }) =>
      LEFT_OUT.test(readFileSync(path, "utf8")),
    );

    expect(found.some(({ marketing }) => marketing)).toBe(true);
  });

  it.each(readers.filter(({ marketing }) => !marketing))(
    "$path reads none of them",
    ({ path }) => {
      expect(readFileSync(path, "utf8")).not.toMatch(LEFT_OUT);
    },
  );
});
