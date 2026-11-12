import { describe, expect, it } from "vitest";
import {
  COLLECTIONS_MAX,
  CONTENT_MAX,
  DESCRIPTION_MAX,
  LANGUAGE_MAX,
  TAG_MAX,
  TAGS_MAX,
  TITLE_MAX,
  URL_MAX,
} from "@/features/items/domain/item-fields";
import {
  createItemSchema,
  deleteItemOptionsSchema,
  favoriteItemSortSchema,
  itemContentSchema,
  itemIdSchema,
  parseItemListParams,
  pinnedItemSortSchema,
  updateItemSchema,
} from "@/features/items/schemas";

describe("deleteItemOptionsSchema", () => {
  it("refreshes the page unless the caller opts out", () => {
    expect(deleteItemOptionsSchema.parse(undefined)).toEqual({ refresh: true });
    expect(deleteItemOptionsSchema.parse({})).toEqual({ refresh: true });
    expect(deleteItemOptionsSchema.parse({ refresh: false })).toEqual({
      refresh: false,
    });
  });

  it("rejects a refresh flag that is not a boolean", () => {
    expect(deleteItemOptionsSchema.safeParse({ refresh: "no" }).success).toBe(
      false,
    );
  });
});

describe("itemContentSchema", () => {
  it("keeps the content as written, leading spaces included", () => {
    expect(itemContentSchema.parse("  indented")).toBe("  indented");
  });

  it("refuses blank content, which would erase the item's text", () => {
    expect(itemContentSchema.safeParse(" \n ").success).toBe(false);
  });

  it("refuses content over the limit", () => {
    expect(
      itemContentSchema.safeParse("a".repeat(CONTENT_MAX + 1)).success,
    ).toBe(false);
  });
});

describe("itemIdSchema", () => {
  it("accepts a cuid as Prisma generates it", () => {
    expect(itemIdSchema.safeParse("cmh8x2k9p0000abcd1234efgh").success).toBe(
      true,
    );
  });

  it("accepts the cuid-shaped ids data migrations generate", () => {
    expect(itemIdSchema.safeParse("c3f2a9b0e1d4c5b6a7980f1e2").success).toBe(
      true,
    );
  });

  it("rejects a UUID", () => {
    expect(
      itemIdSchema.safeParse("6659b32e-547a-435b-8f98-25b192d3111f").success,
    ).toBe(false);
  });

  it("rejects an empty id", () => {
    expect(itemIdSchema.safeParse("").success).toBe(false);
  });

  it("rejects ids with path or query characters", () => {
    expect(itemIdSchema.safeParse("../profile").success).toBe(false);
    expect(itemIdSchema.safeParse("abc?x=1").success).toBe(false);
  });
});

describe("updateItemSchema", () => {
  const base = { title: "Title", tags: [], collectionIds: [] };

  function parse(input: Record<string, unknown>) {
    return updateItemSchema.safeParse({ ...base, ...input });
  }

  it("trims the title", () => {
    expect(parse({ title: "  useDebounce  " }).data?.title).toBe("useDebounce");
  });

  // The parsed input is spread into the update: a key that passed here could
  // attach a file or change the type, and so get around the Pro check.
  it("drops the keys an edit must not reach", () => {
    const { data } = parse({
      fileKey: "users/user-1/file.pdf",
      typeId: "type-1",
      userId: "user-2",
    });

    expect(data).not.toHaveProperty("fileKey");
    expect(data).not.toHaveProperty("typeId");
    expect(data).not.toHaveProperty("userId");
  });

  it("rejects an empty or whitespace-only title", () => {
    expect(parse({ title: "" }).success).toBe(false);
    expect(parse({ title: "   " }).success).toBe(false);
  });

  it("turns an empty description, language or URL into null", () => {
    const { data } = parse({ description: "  ", language: "", url: " " });
    expect(data).toMatchObject({
      description: null,
      language: null,
      url: null,
    });
  });

  it("accepts null to clear the description, language and URL", () => {
    const result = parse({ description: null, language: null, url: null });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      description: null,
      language: null,
      url: null,
    });
  });

  it("keeps the whitespace of content and nulls only blank content", () => {
    expect(parse({ content: "  indented();\n" }).data?.content).toBe(
      "  indented();\n",
    );
    expect(parse({ content: " \n " }).data?.content).toBeNull();
  });

  it("accepts an http(s) URL", () => {
    expect(parse({ url: "https://react.dev/learn" }).data?.url).toBe(
      "https://react.dev/learn",
    );
  });

  it("rejects a URL that is not valid or not http(s)", () => {
    expect(parse({ url: "not a url" }).success).toBe(false);
    expect(parse({ url: "javascript:alert(1)" }).success).toBe(false);
  });

  describe("collectionIds", () => {
    const ids = (count: number) =>
      Array.from({ length: count }, (_, i) => `cmh8x2k9p0000abcd1234e${i}`);

    it("is required, so a save never wipes the links by leaving them out", () => {
      expect(
        updateItemSchema.safeParse({ title: "Title", tags: [] }).success,
      ).toBe(false);
    });

    it("refuses an id that is not a cuid", () => {
      expect(parse({ collectionIds: ["not an id"] }).success).toBe(false);
    });

    it("counts the ids after dropping duplicates", () => {
      const repeated = [...ids(COLLECTIONS_MAX), ids(1)[0]];

      expect(parse({ collectionIds: repeated }).data?.collectionIds).toEqual(
        ids(COLLECTIONS_MAX),
      );
    });

    it("refuses more than the limit", () => {
      expect(parse({ collectionIds: ids(COLLECTIONS_MAX + 1) }).success).toBe(
        false,
      );
    });
  });

  it("trims tags and drops duplicates", () => {
    expect(parse({ tags: [" react", "hooks ", "react"] }).data?.tags).toEqual([
      "react",
      "hooks",
    ]);
  });

  it("rejects an empty tag", () => {
    expect(parse({ tags: ["react", "  "] }).success).toBe(false);
  });

  it("leaves out the fields that were not sent", () => {
    const { data } = parse({});
    expect(data).toEqual({ title: "Title", tags: [], collectionIds: [] });
  });

  describe("limits", () => {
    it("accepts every field at its limit", () => {
      const result = parse({
        title: "t".repeat(TITLE_MAX),
        description: "d".repeat(DESCRIPTION_MAX),
        content: "c".repeat(CONTENT_MAX),
        language: "l".repeat(LANGUAGE_MAX),
        tags: Array.from({ length: TAGS_MAX }, (_, i) => `tag-${i}`),
      });
      expect(result.success).toBe(true);
    });

    it("rejects a field one character over its limit", () => {
      expect(parse({ title: "t".repeat(TITLE_MAX + 1) }).success).toBe(false);
      expect(
        parse({ description: "d".repeat(DESCRIPTION_MAX + 1) }).success,
      ).toBe(false);
      expect(parse({ content: "c".repeat(CONTENT_MAX + 1) }).success).toBe(
        false,
      );
      expect(parse({ language: "l".repeat(LANGUAGE_MAX + 1) }).success).toBe(
        false,
      );
      expect(
        parse({ url: `https://a.dev/${"p".repeat(URL_MAX)}` }).success,
      ).toBe(false);
    });

    it("rejects a tag over its limit and a list over the tag count", () => {
      expect(parse({ tags: ["x".repeat(TAG_MAX + 1)] }).success).toBe(false);
      const tooMany = Array.from({ length: TAGS_MAX + 1 }, (_, i) => `t${i}`);
      expect(parse({ tags: tooMany }).success).toBe(false);
    });

    it("counts the tags after dropping duplicates", () => {
      const tags = [
        ...Array.from({ length: TAGS_MAX }, (_, i) => `t${i}`),
        "t0",
      ];
      expect(parse({ tags }).data?.tags).toHaveLength(TAGS_MAX);
    });
  });
});

describe("createItemSchema", () => {
  const base = {
    typeName: "snippet",
    title: "Title",
    tags: [],
    collectionIds: [],
  };

  function parse(input: Record<string, unknown>) {
    return createItemSchema.safeParse({ ...base, ...input });
  }

  function firstError(input: Record<string, unknown>) {
    return parse(input).error?.issues[0].message;
  }

  it("rejects a type it does not know", () => {
    expect(parse({ typeName: "recipe" }).success).toBe(false);
  });

  describe("file", () => {
    const file = { key: "users/u1/abc.pdf", name: "Report.PDF" };

    it("requires the upload for a file or image", () => {
      expect(firstError({ typeName: "file" })).toBe("Upload the file first");
      expect(firstError({ typeName: "image" })).toBe("Upload the image first");
    });

    it("accepts a file whose name has the extension of its key", () => {
      expect(parse({ typeName: "file", file }).data?.file).toEqual(file);
    });

    it("rejects an upload on a type without one", () => {
      expect(firstError({ file })).toBe("This item type has no file");
    });

    it("rejects a name whose extension differs from the key", () => {
      expect(
        firstError({ typeName: "file", file: { ...file, name: "notes.txt" } }),
      ).toBe("The file name does not match the upload");
    });

    it("rejects a name over 255 characters", () => {
      const name = `${"a".repeat(252)}.pdf`;
      expect(parse({ typeName: "file", file: { ...file, name } }).success).toBe(
        false,
      );
    });
  });

  it("requires a URL for a link", () => {
    expect(firstError({ typeName: "link" })).toBe("URL is required");
    expect(firstError({ typeName: "link", url: "  " })).toBe("URL is required");
  });

  it("rejects a link URL that is not http(s)", () => {
    expect(parse({ typeName: "link", url: "ftp://example.com" }).success).toBe(
      false,
    );
  });

  it("accepts a link with an http(s) URL", () => {
    expect(
      parse({ typeName: "link", url: "https://react.dev" }).data?.url,
    ).toBe("https://react.dev");
  });

  it("needs no URL for a snippet", () => {
    expect(parse({ content: "const x = 1;" }).success).toBe(true);
  });

  it("requires a title", () => {
    expect(firstError({ title: "  " })).toBe("Title is required");
  });

  it("turns blank optional fields into null", () => {
    const { data } = parse({ description: " ", content: "\n", language: "" });
    expect(data).toMatchObject({
      description: null,
      content: null,
      language: null,
    });
  });

  it("drops duplicate tags", () => {
    expect(parse({ tags: ["react", "react "] }).data?.tags).toEqual(["react"]);
  });
});

describe("parseItemListParams", () => {
  const DEFAULTS = { sort: "newest", tag: null, page: 1 };

  it("gives the default view for no parameters", () => {
    expect(parseItemListParams({})).toEqual(DEFAULTS);
  });

  it("reads a valid sort, tag and page", () => {
    expect(
      parseItemListParams({ sort: "z-a", tag: "  react ", page: "3" }),
    ).toEqual({ sort: "z-a", tag: "react", page: 3 });
  });

  it("falls back to the defaults for invalid values instead of throwing", () => {
    expect(parseItemListParams({ sort: "foo", page: "-3" })).toEqual(DEFAULTS);
    expect(parseItemListParams({ sort: "type", page: "1e3" })).toEqual(
      DEFAULTS,
    );
    expect(parseItemListParams({ tag: "   ", page: "0" })).toEqual(DEFAULTS);
    expect(parseItemListParams({ tag: "x".repeat(TAG_MAX + 1) })).toEqual(
      DEFAULTS,
    );
  });

  it("ignores a parameter given twice", () => {
    expect(
      parseItemListParams({
        sort: ["a-z", "z-a"],
        tag: ["a", "b"],
        page: ["2"],
      }),
    ).toEqual(DEFAULTS);
  });

  it("reads the null that URLSearchParams.get gives for a missing value", () => {
    expect(parseItemListParams({ sort: null, tag: null, page: null })).toEqual(
      DEFAULTS,
    );
  });
});

describe("list sort schemas", () => {
  it("keep a known sort and fall back to newest for anything else", () => {
    expect(favoriteItemSortSchema.parse("type")).toBe("type");
    expect(favoriteItemSortSchema.parse("foo")).toBe("newest");
    expect(favoriteItemSortSchema.parse(null)).toBe("newest");
    expect(pinnedItemSortSchema.parse("z-a")).toBe("z-a");
    expect(pinnedItemSortSchema.parse("type")).toBe("newest");
  });
});
