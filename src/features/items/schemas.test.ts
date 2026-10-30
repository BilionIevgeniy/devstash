import { describe, expect, it } from "vitest";
import {
  createItemSchema,
  deleteItemOptionsSchema,
  itemIdSchema,
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
  const base = { title: "Title", tags: [] };

  function parse(input: Record<string, unknown>) {
    return updateItemSchema.safeParse({ ...base, ...input });
  }

  it("trims the title", () => {
    expect(parse({ title: "  useDebounce  " }).data?.title).toBe("useDebounce");
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
    expect(data).toEqual({ title: "Title", tags: [] });
  });
});

describe("createItemSchema", () => {
  const base = { typeName: "snippet", title: "Title", tags: [] };

  function parse(input: Record<string, unknown>) {
    return createItemSchema.safeParse({ ...base, ...input });
  }

  function firstError(input: Record<string, unknown>) {
    return parse(input).error?.issues[0].message;
  }

  it("rejects a type it does not know or that needs an upload", () => {
    expect(parse({ typeName: "recipe" }).success).toBe(false);
    expect(parse({ typeName: "file" }).success).toBe(false);
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
