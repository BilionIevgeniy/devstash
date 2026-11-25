import { describe, expect, it } from "vitest";
import {
  aiSource,
  appendTag,
  canCreateOfType,
  canUseType,
  CONTENT_MAX,
  contentError,
  contentTypeFor,
  copyValueOf,
  editableFields,
  editableUpdate,
  hasTag,
  isHttpUrl,
  itemFormError,
  parseTagInput,
  requiresPro,
  TAG_MAX,
  TAGS_MAX,
  typeListing,
} from "@/features/items/domain/item-fields";

describe("requiresPro", () => {
  it.each([
    ["file", true],
    ["image", true],
    ["snippet", false],
    ["link", false],
    ["recipe", false],
  ])("%s needs Pro: %s", (typeName, expected) => {
    expect(requiresPro(typeName)).toBe(expected);
  });
});

describe("typeListing", () => {
  it.each([
    ["image", "gallery"],
    ["file", "files"],
    ["snippet", "cards"],
    ["recipe", "cards"],
  ])("%s is listed as %s", (typeName, expected) => {
    expect(typeListing(typeName)).toBe(expected);
  });
});

describe("canUseType", () => {
  it.each([
    ["file", false, false],
    ["image", false, false],
    ["snippet", false, true],
    ["recipe", false, true],
    ["file", true, true],
    ["image", true, true],
    ["snippet", true, true],
  ])("%s with isPro %s: %s", (typeName, isPro, expected) => {
    expect(canUseType(typeName, isPro)).toBe(expected);
  });
});

describe("contentTypeFor", () => {
  it.each([
    ["link", "URL"],
    ["snippet", "TEXT"],
    ["command", "TEXT"],
    ["prompt", "TEXT"],
    ["note", "TEXT"],
    ["file", "FILE"],
    ["image", "FILE"],
  ])("stores a %s as %s", (typeName, contentType) => {
    expect(contentTypeFor(typeName)).toBe(contentType);
  });
});

describe("copyValueOf", () => {
  const item = { content: "npm run dev", url: "https://nextjs.org" };

  it("copies the content of a text item", () => {
    expect(copyValueOf({ ...item, contentType: "TEXT" })).toBe("npm run dev");
  });

  it("copies the URL of a link", () => {
    expect(copyValueOf({ ...item, contentType: "URL" })).toBe(
      "https://nextjs.org",
    );
  });

  it("copies nothing when the field is empty", () => {
    expect(copyValueOf({ ...item, contentType: "TEXT", content: null })).toBe(
      null,
    );
    expect(copyValueOf({ ...item, contentType: "URL", url: null })).toBe(null);
  });

  it("copies nothing from an upload or an unknown content type", () => {
    expect(copyValueOf({ ...item, contentType: "FILE" })).toBe(null);
    expect(copyValueOf({ ...item, contentType: "OTHER" })).toBe(null);
  });
});

describe("editableFields", () => {
  const none = {
    content: false,
    codeEditor: false,
    language: false,
    url: false,
    file: null,
  };

  it.each([
    ["snippet", { ...none, content: true, codeEditor: true, language: true }],
    ["command", { ...none, content: true, codeEditor: true, language: true }],
    ["prompt", { ...none, content: true }],
    ["note", { ...none, content: true }],
    ["link", { ...none, url: true }],
    ["file", { ...none, file: "file" }],
    ["image", { ...none, file: "image" }],
  ])("gives the fields of a %s", (typeName, fields) => {
    expect(editableFields(typeName)).toEqual(fields);
  });

  it("gives a custom type the fields of a snippet: content and language", () => {
    expect(editableFields("Recipes")).toEqual({
      content: true,
      codeEditor: true,
      language: true,
      url: false,
      file: null,
    });
  });
});

describe("aiSource", () => {
  const values = {
    content: "export function useAuth() {}",
    url: "https://react.dev",
    fileName: "diagram.png",
  };

  it("reads the content of a text type, not a URL left from another type", () => {
    expect(aiSource(editableFields("snippet"), values)).toEqual({
      kind: "content",
      text: values.content,
    });
  });

  it("reads the URL of a link, not content left from another type", () => {
    expect(aiSource(editableFields("link"), values)).toEqual({
      kind: "url",
      text: values.url,
    });
  });

  it.each([
    ["file", "File: diagram.png"],
    ["image", "Image: diagram.png"],
  ])("names the upload of a %s", (typeName, text) => {
    expect(aiSource(editableFields(typeName), values)).toEqual({
      kind: "file",
      text,
    });
  });

  it.each([[undefined], [null], ["  "]])(
    "sends nothing for a file with no name yet (%j)",
    (fileName) => {
      expect(aiSource(editableFields("file"), { ...values, fileName })).toEqual(
        { kind: "file", text: "" },
      );
    },
  );

  it("reads the content of a custom type", () => {
    expect(aiSource(editableFields("Recipes"), values)).toEqual({
      kind: "content",
      text: values.content,
    });
  });
});

describe("parseTagInput", () => {
  it("splits on commas and trims each tag", () => {
    expect(parseTagInput(" react ,hooks,  state ")).toEqual([
      "react",
      "hooks",
      "state",
    ]);
  });

  it("drops empty and whitespace-only entries", () => {
    expect(parseTagInput("react, , ,hooks,")).toEqual(["react", "hooks"]);
  });

  it("keeps the first of each duplicate", () => {
    expect(parseTagInput("react, hooks, react")).toEqual(["react", "hooks"]);
  });

  it("returns an empty list for an empty or blank input", () => {
    expect(parseTagInput("")).toEqual([]);
    expect(parseTagInput("  ,  ")).toEqual([]);
  });
});

describe("editableUpdate", () => {
  const base = { title: "Title", tags: ["react"] };

  it("drops the fields a link does not have", () => {
    expect(
      editableUpdate("link", {
        ...base,
        content: "stray",
        language: "ts",
        url: "https://react.dev",
      }),
    ).toEqual({ data: { ...base, url: "https://react.dev" } });
  });

  it("drops a URL sent for a note", () => {
    expect(
      editableUpdate("note", { ...base, content: "hi", url: "https://a.dev" }),
    ).toEqual({ data: { ...base, content: "hi" } });
  });

  it("applies a cleared language on a snippet", () => {
    expect(editableUpdate("snippet", { ...base, language: null })).toEqual({
      data: { ...base, language: null },
    });
  });

  it("refuses to clear the URL of a link", () => {
    expect(editableUpdate("link", { ...base, url: null })).toEqual({
      error: "urlRequired",
    });
  });

  it("leaves the URL of a link alone when it is not sent", () => {
    expect(editableUpdate("link", base)).toEqual({ data: base });
  });

  it("keeps only the common fields for an image", () => {
    expect(
      editableUpdate("image", { ...base, content: "x", url: "https://a.dev" }),
    ).toEqual({ data: base });
  });
});

describe("hasTag", () => {
  it("finds a tag whatever its case", () => {
    expect(hasTag("React, hooks", "react")).toBe(true);
  });

  it("does not match part of a tag", () => {
    expect(hasTag("react-native", "react")).toBe(false);
  });
});

describe("appendTag", () => {
  it("adds a tag to an empty field", () => {
    expect(appendTag("", "react")).toBe("react");
  });

  it("adds a tag after the others", () => {
    expect(appendTag("react, hooks ,", "state")).toBe("react, hooks, state");
  });

  it("leaves the field as typed when the tag is there in another case", () => {
    expect(appendTag("React,hooks", "react")).toBe("React,hooks");
  });

  it("refuses a tag once the field is full", () => {
    const full = Array.from({ length: TAGS_MAX }, (_, i) => `tag${i}`).join(
      ",",
    );

    expect(appendTag(full, "react")).toBeNull();
  });
});

describe("contentError", () => {
  const snippet = editableFields("snippet");

  it("accepts content up to the limit", () => {
    expect(contentError(snippet, "x".repeat(CONTENT_MAX))).toBeNull();
  });

  it("refuses content one character over the limit, with the code the server uses", () => {
    expect(contentError(snippet, "x".repeat(CONTENT_MAX + 1))).toEqual({
      error: "contentTooLong",
      params: { max: CONTENT_MAX },
    });
  });

  it("does not judge the content of a type that has no content field", () => {
    expect(
      contentError(editableFields("link"), "x".repeat(CONTENT_MAX + 1)),
    ).toBeNull();
  });
});

describe("canCreateOfType", () => {
  it("opens the free system types to everyone", () => {
    expect(canCreateOfType("snippet", false)).toBe(true);
  });

  it("keeps the upload types and the custom types for Pro", () => {
    expect(canCreateOfType("file", false)).toBe(false);
    expect(canCreateOfType("Recipe", false)).toBe(false);
    expect(canCreateOfType("Recipe", true)).toBe(true);
    expect(canCreateOfType("image", true)).toBe(true);
  });
});

describe("isHttpUrl", () => {
  it("takes http and https addresses", () => {
    expect(isHttpUrl("https://example.com/a?b=1")).toBe(true);
    expect(isHttpUrl("http://localhost:3000")).toBe(true);
  });

  it("refuses other schemes and text that is no URL", () => {
    expect(isHttpUrl("ftp://example.com")).toBe(false);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("example.com")).toBe(false);
  });
});

describe("itemFormError", () => {
  const link = editableFields("link");
  const snippet = editableFields("snippet");
  const valid = { url: "", content: "", tags: "" };

  it("passes a form the server would take", () => {
    expect(
      itemFormError(link, { ...valid, url: " https://example.com " }),
    ).toBeNull();
  });

  it("leaves an empty URL to the input's required", () => {
    expect(itemFormError(link, valid)).toBeNull();
  });

  it("refuses a URL that is not http(s), only for a type with one", () => {
    const ftp = { ...valid, url: "ftp://x" };
    expect(itemFormError(link, ftp)).toEqual({
      field: "url",
      error: "invalidUrl",
    });
    expect(itemFormError(snippet, ftp)).toBeNull();
  });

  it("refuses content over the limit", () => {
    expect(
      itemFormError(snippet, {
        ...valid,
        content: "x".repeat(CONTENT_MAX + 1),
      }),
    ).toEqual({
      field: "content",
      error: "contentTooLong",
      params: { max: CONTENT_MAX },
    });
  });

  it("counts the tags as the schema does: duplicates and blanks drop out", () => {
    const tags = Array.from({ length: TAGS_MAX }, (_, i) => `t${i}`);
    expect(
      itemFormError(snippet, {
        ...valid,
        tags: [...tags, "t0", " "].join(","),
      }),
    ).toBeNull();
    expect(
      itemFormError(snippet, { ...valid, tags: [...tags, "extra"].join(",") }),
    ).toEqual({
      field: "tags",
      error: "tooManyTags",
      params: { max: TAGS_MAX },
    });
  });

  it("refuses a tag over its length", () => {
    expect(
      itemFormError(snippet, {
        ...valid,
        tags: `ok, ${"x".repeat(TAG_MAX + 1)}`,
      }),
    ).toEqual({ field: "tags", error: "tagTooLong", params: { max: TAG_MAX } });
  });

  it("names the first refused field in the order of the form", () => {
    expect(
      itemFormError(link, {
        url: "ftp://x",
        content: "",
        tags: "x".repeat(99),
      }),
    ).toMatchObject({ field: "url" });
  });
});

describe("a custom type named like a member of every object", () => {
  it.each(["constructor", "toString", "__proto__"])(
    "%s is a text type, not an upload",
    (name) => {
      expect(editableFields(name).file).toBeNull();
      expect(requiresPro(name)).toBe(false);
    },
  );
});

describe("tags and URLs at their edges", () => {
  it("finds and adds a tag whatever its blanks and case", () => {
    expect(hasTag("react", " React ")).toBe(true);
    expect(appendTag("hooks", " react ")).toBe("hooks, react");
  });

  it("takes a tag of exactly the limit and a URL with blanks around it", () => {
    const error = (values: { url: string; tags: string }) =>
      itemFormError(editableFields("link"), { content: "", ...values });
    expect(error({ url: " https://x.test ", tags: "" })).toBeNull();
    expect(error({ url: "   ", tags: "x".repeat(TAG_MAX) })).toBeNull();
    expect(error({ url: "", tags: "x".repeat(TAG_MAX + 1) })).toMatchObject({
      field: "tags",
    });
  });

  it("reads no file name for a type that has no field at all", () => {
    const none = { ...editableFields("note"), content: false };
    expect(aiSource(none, { content: "c", url: "u", fileName: "f" })).toEqual({
      kind: "none",
      text: "",
    });
  });
});
