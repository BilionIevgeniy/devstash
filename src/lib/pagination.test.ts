import { describe, expect, it, vi } from "vitest";

import {
  clampPage,
  pageHref,
  pageNumbers,
  parsePage,
  readPage,
  totalPages,
} from "@/lib/pagination";

describe("parsePage", () => {
  it("reads a positive integer", () => {
    expect(parsePage("1")).toBe(1);
    expect(parsePage("12")).toBe(12);
  });

  it.each([
    [undefined],
    [""],
    ["0"],
    ["-1"],
    ["1.5"],
    ["2.0"],
    ["1e3"],
    ["0x10"],
    [" 2"],
    ["02"],
    ["abc"],
    [["2", "3"]],
  ])("falls back to the first page for %j", (value) => {
    expect(parsePage(value)).toBe(1);
  });

  it("lets a huge number through for clampPage to bring back", () => {
    const page = parsePage("9".repeat(400));

    expect(page).toBe(Infinity);
    expect(clampPage(page, 3)).toBe(3);
  });
});

describe("totalPages", () => {
  it("rounds up, and an empty list still has one page", () => {
    expect(totalPages(0, 21)).toBe(1);
    expect(totalPages(21, 21)).toBe(1);
    expect(totalPages(22, 21)).toBe(2);
  });
});

describe("pageHref", () => {
  it("keeps the first page free of a query string", () => {
    expect(pageHref("/collections", 1)).toBe("/collections");
    expect(pageHref("/collections", 2)).toBe("/collections?page=2");
  });
});

describe("pageNumbers", () => {
  it("shows every page of a short list", () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
    expect(pageNumbers(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it("keeps the first, the last and the neighbours of the current page", () => {
    expect(pageNumbers(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
  });

  it("shows the number a gap would hide on its own", () => {
    expect(pageNumbers(4, 20)).toEqual([1, 2, 3, 4, 5, "gap", 20]);
    expect(pageNumbers(17, 20)).toEqual([1, "gap", 16, 17, 18, 19, 20]);
  });

  it("has one gap at either end of a long list", () => {
    expect(pageNumbers(1, 20)).toEqual([1, 2, "gap", 20]);
    expect(pageNumbers(20, 20)).toEqual([1, "gap", 19, 20]);
  });
});

describe("readPage", () => {
  it("reads only the rows of the requested page", async () => {
    const read = vi.fn().mockResolvedValue(["row"]);

    const result = await readPage(2, 21, async () => 50, read);

    expect(read).toHaveBeenCalledWith(21, 21);
    expect(result).toEqual({
      items: ["row"],
      totalCount: 50,
      page: 2,
      totalPages: 3,
    });
  });

  it("shows the last page for a page past the end", async () => {
    const read = vi.fn().mockResolvedValue([]);

    const result = await readPage(9, 21, async () => 22, read);

    expect(read).toHaveBeenCalledWith(21, 21);
    expect(result.page).toBe(2);
  });

  it("reads the first page of an empty list", async () => {
    const read = vi.fn().mockResolvedValue([]);

    const result = await readPage(4, 21, async () => 0, read);

    expect(read).toHaveBeenCalledWith(0, 21);
    expect(result).toMatchObject({ page: 1, totalPages: 1 });
  });
});
