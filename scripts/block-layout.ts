// Compares the boxes of a loading state with the boxes of the page that
// replaced it (e2e/support/held/placeholders.ts measures them, spec 27). Pure, so
// the rules of the comparison are unit-tested.

export interface Block {
  /** How a difference names it: the tag and its place among its siblings. */
  name: string;
  /** A skeleton bar or box: the loading state's leaf. */
  bar: boolean;
  /** Has a border or a background: its two edges are seen. */
  framed?: boolean;
  top: number;
  bottom: number;
  left: number;
  right: number;
  children: Block[];
}

export interface CompareOptions {
  /**
   * The lists whose number of rows is not known while they load, as the end of
   * the path a difference would name ("section:5 > div:2"). Their rows are
   * compared as far as both states have them, and the heights that follow from
   * the count are not. Anywhere else another number of blocks is a difference.
   */
  rows?: readonly string[];
  /** The body is as long as its text: the box a tall bar stands for may be too. */
  text?: boolean;
  /**
   * How many levels below the page are compared, for rows and cards whose
   * inside is not drawn: their boxes are, not what is in them.
   */
  depth?: number;
}

/** Sub-pixel layout: a fraction of a pixel is not a difference. */
const TOLERANCE = 1;
/** A bar up to this height stands for a line of text, which is taller. */
const LINE_BAR = 28;
/** How much taller the line of text may be than its bar. */
const LINE_SLACK = 12;
/** Up to this height a bar stands for a control or a title, as wide as its text. */
const TEXT_WIDE = 44;

const near = (a: number, b: number) => Math.abs(a - b) <= TOLERANCE;
const height = (block: Block) => block.bottom - block.top;
const center = (block: Block) => (block.left + block.right) / 2;

// A wrapper of the same box as its one child says nothing about the layout,
// and the two states do not have to wrap alike.
function* unwrapped(block: Block): Generator<Block> {
  yield block;
  const [only] = block.children;
  if (block.bar || block.children.length !== 1) return;
  const same =
    near(block.top, only.top) &&
    near(block.bottom, only.bottom) &&
    near(block.left, only.left) &&
    near(block.right, only.right);
  if (same) yield* unwrapped(only);
}

// The two blocks to compare: the first pair, looking through wrappers, that
// has as many children, else the innermost that have any.
function pairOf(before: Block, after: Block): [Block, Block] {
  for (const b of unwrapped(before)) {
    for (const a of unwrapped(after)) {
      if (b.bar || b.children.length === a.children.length) return [b, a];
    }
  }
  const innermost = (block: Block) =>
    [...unwrapped(block)].filter(({ children }) => children.length > 0).at(-1);
  return [innermost(before) ?? before, innermost(after) ?? after];
}

// The page itself: the frames around both states grow with the screen and do
// not count.
function pagesOf(before: Block, after: Block): [Block, Block] {
  return before.children.length === 1 && after.children.length === 1
    ? pagesOf(before.children[0], after.children[0])
    : [before, after];
}

interface Result {
  differences: string[];
  /** The list inside has another number of rows: no height follows from it. */
  resized: boolean;
}

const where = (path: string, message: string) => `${path}: ${message}`;
const px = (value: number) => `${Math.round(value * 100) / 100}px`;

// One edge is enough for what is as wide as its text: the left, the right of a
// right-held one, the middle of a centred one.
function sameEdge(before: Block, after: Block): boolean {
  return (
    near(before.left, after.left) ||
    near(before.right, after.right) ||
    near(center(before), center(after))
  );
}

function compareLine(
  path: string,
  before: Block,
  after: Block,
  base: { before: number; after: number },
): string[] {
  const top = before.top - base.before;
  const lineTop = after.top - base.after;
  const inside =
    top >= lineTop - TOLERANCE &&
    top + height(before) <= lineTop + height(after) + TOLERANCE;
  const differences: string[] = [];
  // In the middle of a taller line: a line of 44px, the touch target of a phone.
  const middle = near(top + height(before) / 2, lineTop + height(after) / 2);
  const fits =
    (middle && height(after) <= TEXT_WIDE + TOLERANCE) ||
    height(after) - height(before) <= LINE_SLACK;
  if (!inside || !fits) {
    differences.push(
      where(
        path,
        `a ${px(height(before))} bar at ${px(top)} is not the line of ${px(height(after))} at ${px(lineTop)}`,
      ),
    );
  }
  if (!sameEdge(before, after)) {
    differences.push(
      where(
        path,
        `starts at ${px(before.left)}, its line at ${px(after.left)}`,
      ),
    );
  }
  return differences;
}

function compareChildren(
  path: string,
  before: Block,
  after: Block,
  options: CompareOptions,
  depth: number,
): Result {
  const differences: string[] = [];
  let resized = false;
  if (before.children.length !== after.children.length) {
    if (!options.rows?.some((list) => path.endsWith(` > ${list}`))) {
      differences.push(
        where(
          path,
          `${before.children.length} blocks while loading, ${after.children.length} after`,
        ),
      );
    }
    resized = true;
  }
  const count = Math.min(before.children.length, after.children.length);
  // Each block is placed from the end of the one before it, so one difference
  // is not reported again for everything below it.
  const base = { before: before.top, after: after.top };
  for (let index = 0; index < count; index++) {
    const child = before.children[index];
    const childAfter = after.children[index];
    const previous = before.children[index - 1];
    // Below the one before it: placed from its end. Beside it: from where the
    // row starts.
    if (previous && child.top >= previous.bottom - TOLERANCE) {
      base.before = previous.bottom;
      base.after = after.children[index - 1].bottom;
    }
    const result = compareAt(
      `${path} > ${child.name}`,
      child,
      childAfter,
      base,
      options,
      depth,
    );
    differences.push(...result.differences);
    resized ||= result.resized;
  }
  return { differences, resized };
}

function compareAt(
  path: string,
  wrappedBefore: Block,
  wrappedAfter: Block,
  base: { before: number; after: number },
  options: CompareOptions,
  depth: number,
): Result {
  const [before, after] = pairOf(wrappedBefore, wrappedAfter);
  if (before.bar && height(before) <= LINE_BAR) {
    return {
      differences: compareLine(path, before, after, base),
      resized: false,
    };
  }
  const differences: string[] = [];
  // A bar has nothing inside, a text has no blocks, and a part with no bar in it
  // is the real one: only their boxes count.
  const children =
    before.bar || !hasBar(before) || after.children.length === 0 || depth === 0
      ? { differences: [], resized: false }
      : compareChildren(path, before, after, options, depth - 1);
  const resized =
    children.resized ||
    Boolean(options.text && before.bar && height(before) > TEXT_WIDE);
  const gap = before.top - base.before;
  const gapAfter = after.top - base.after;
  if (!near(gap, gapAfter)) {
    differences.push(where(path, `${px(gap)} below, then ${px(gapAfter)}`));
  }
  if (!resized && !near(height(before), height(after))) {
    differences.push(
      where(path, `${px(height(before))} tall, then ${px(height(after))}`),
    );
  }
  const bothEdges =
    (before.bar && height(before) > TEXT_WIDE) ||
    (before.framed && after.framed);
  const boxEdges = bothEdges
    ? near(before.left, after.left) && near(before.right, after.right)
    : sameEdge(before, after);
  if (!boxEdges) {
    differences.push(
      where(
        path,
        `from ${px(before.left)} to ${px(before.right)}, then from ${px(after.left)} to ${px(after.right)}`,
      ),
    );
  }
  return {
    differences: [...differences, ...children.differences],
    resized,
  };
}

// What differs between the two states, or nothing. A bar of one line of text
// lies inside the line; every other block has the place and the height of the
// one that replaces it, and as many blocks come before it. A box and a framed
// block also have both of its edges; any other block is as wide as what is in
// it, so one edge, or the middle, is enough.
export function compareBlocks(
  before: Block,
  after: Block,
  options: CompareOptions = {},
): string[] {
  const [page, pageAfter] = pagesOf(before, after);
  return compareAt(
    page.name,
    page,
    pageAfter,
    { before: page.top, after: pageAfter.top },
    options,
    options.depth ?? Infinity,
  ).differences;
}

export function hasBar(block: Block): boolean {
  return block.bar || block.children.some(hasBar);
}
