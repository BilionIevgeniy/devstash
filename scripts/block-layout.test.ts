import { describe, expect, it } from "vitest";
import { compareBlocks, hasBar, type Block } from "./block-layout";

function block(
  name: string,
  top: number,
  height: number,
  extra: Partial<Block> = {},
): Block {
  return {
    name,
    bar: false,
    top,
    bottom: top + height,
    left: 0,
    right: 300,
    children: [],
    ...extra,
  };
}

const bar = (name: string, top: number, height: number, right = 300) =>
  block(name, top, height, { bar: true, right });

describe("compareBlocks", () => {
  it("accepts a box of the same place and size", () => {
    const before = block("main", 0, 200, {
      children: [bar("div", 0, 90), bar("div", 110, 90)],
    });
    const after = block("main", 0, 200, {
      children: [block("div", 0, 90), block("div", 110, 90)],
    });
    expect(compareBlocks(before, after)).toEqual([]);
  });

  it("reports a box two pixels shorter, once and not for the blocks below", () => {
    const before = block("main", 0, 200, {
      children: [bar("div", 0, 136), bar("p", 152, 48)],
    });
    const after = block("main", 0, 202, {
      children: [block("div", 0, 138), block("p", 154, 48)],
    });
    expect(compareBlocks(before, after)).toEqual([
      "main: 200px tall, then 202px",
      "main > div: 136px tall, then 138px",
    ]);
  });

  it("accepts a bar inside its taller line of text, whatever its width", () => {
    const before = block("header", 0, 60, {
      children: [bar("h1", 0, 36, 192), bar("p", 40, 20, 160)],
    });
    const after = block("header", 0, 60, {
      children: [block("h1", 0, 36), block("p", 36, 24)],
    });
    expect(compareBlocks(before, after)).toEqual([]);
  });

  it("reports a bar that leaves its line", () => {
    const before = block("header", 0, 60, {
      children: [bar("h1", 0, 28), bar("p", 30, 24, 160)],
    });
    const after = block("header", 0, 60, {
      children: [block("h1", 0, 28), block("p", 36, 24)],
    });
    expect(compareBlocks(before, after)).toEqual([
      "header > p: a 24px bar at 2px is not the line of 24px at 8px",
    ]);
  });

  it("reports a bar that stands for something far taller than a line", () => {
    const before = block("div", 0, 48, { children: [bar("p", 0, 20)] });
    const after = block("div", 0, 48, { children: [block("p", 0, 48)] });
    expect(compareBlocks(before, after)).toHaveLength(1);
  });

  it("compares the height of a control exactly, and its box on both edges", () => {
    const control = block("div", 0, 44, { children: [bar("a", 0, 32, 80)] });
    const taller = block("div", 0, 44, { children: [block("a", 0, 44)] });
    expect(compareBlocks(control, taller)).toEqual(["a: 32px tall, then 44px"]);
    const card = block("div", 0, 90, { children: [bar("a", 0, 90, 80)] });
    const wider = block("div", 0, 90, {
      children: [
        block("a", 0, 90),
        block("i", 0, 2, { left: 301, right: 310 }),
      ],
    });
    expect(compareBlocks(card, wider, { rows: true })).toEqual([
      "div > a: from 0px to 80px, then from 0px to 300px",
    ]);
  });

  it("reports a block the loading state does not have", () => {
    const before = block("header", 0, 60, {
      children: [bar("h1", 0, 28), bar("p", 30, 20)],
    });
    const after = block("header", 0, 60, {
      children: [
        block("h1", 0, 28),
        block("p", 28, 24),
        block("button", 0, 32),
      ],
    });
    expect(compareBlocks(before, after)).toEqual([
      "header: 2 blocks while loading, 3 after",
    ]);
  });

  it("compares the rows both states have when their number is not known", () => {
    const rows = (count: number, height: number, isBar: boolean) =>
      Array.from({ length: count }, (_, index) =>
        block("li", index * height, height, { bar: isBar }),
      );
    const before = block("ul", 0, 6 * 36, { children: rows(6, 36, true) });
    const after = block("ul", 0, 2 * 36, { children: rows(2, 36, false) });
    expect(compareBlocks(before, after, { rows: true })).toEqual([]);
    expect(compareBlocks(before, after)).toHaveLength(1);

    const taller = block("ul", 0, 2 * 44, { children: rows(2, 44, false) });
    expect(compareBlocks(before, taller, { rows: true })).toHaveLength(2);
  });

  it("places a block after a list from the end of the list", () => {
    const before = block("div", 0, 300, {
      children: [
        block("ul", 0, 72, {
          children: [bar("li", 0, 36), bar("li", 36, 36)],
        }),
        bar("section", 104, 90),
      ],
    });
    const after = block("div", 0, 300, {
      children: [
        block("ul", 0, 36, { children: [block("li", 0, 36)] }),
        block("section", 68, 90),
      ],
    });
    expect(compareBlocks(before, after, { rows: true })).toEqual([]);
  });

  it("lets a tall box be as long as its text, when the case says so", () => {
    const before = block("div", 0, 220, {
      children: [bar("h2", 0, 20), bar("div", 28, 192)],
    });
    const after = block("div", 0, 125, {
      children: [block("h2", 0, 20), block("div", 28, 97)],
    });
    expect(compareBlocks(before, after)).toHaveLength(2);
    expect(compareBlocks(before, after, { text: true })).toEqual([]);
    const lower = block("div", 0, 133, {
      children: [block("h2", 0, 20), block("div", 36, 97)],
    });
    expect(compareBlocks(before, lower, { text: true })).toHaveLength(1);
  });

  it("looks through a wrapper of the same box as its one child", () => {
    const before = block("main", 0, 90, { children: [bar("div", 0, 90)] });
    const after = block("main", 0, 90, {
      children: [block("div", 0, 90, { children: [block("section", 0, 90)] })],
    });
    expect(compareBlocks(before, after)).toEqual([]);
  });
});

describe("compareBlocks, the frames", () => {
  it("does not compare a frame that grows with the screen", () => {
    const before = block("main", 0, 800, {
      children: [bar("div", 0, 800)],
    });
    const after = block("main", 0, 800, {
      children: [block("div", 0, 120)],
    });
    expect(compareBlocks(before, after)).toEqual([
      "div: 800px tall, then 120px",
    ]);
  });

  it("compares the box of a row and not its inside beyond the depth", () => {
    const row = (top: number, children: Block[]) =>
      block("li", top, 36, { children });
    const before = block("ul", 0, 72, {
      children: [row(0, [bar("i", 0, 16)]), row(36, [bar("i", 36, 16)])],
    });
    const after = block("ul", 0, 72, {
      children: [
        row(0, [block("button", 0, 36), block("b", 0, 36, { left: 301 })]),
        row(36, [block("button", 36, 36), block("b", 36, 36)]),
      ],
    });
    expect(compareBlocks(before, after)).not.toEqual([]);
    expect(compareBlocks(before, after, { depth: 1 })).toEqual([]);
  });
});

describe("hasBar", () => {
  it("finds a bar at any depth", () => {
    expect(hasBar(block("div", 0, 1))).toBe(false);
    expect(hasBar(block("div", 0, 9, { children: [bar("div", 0, 9)] }))).toBe(
      true,
    );
  });
});
