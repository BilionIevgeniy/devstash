import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./support/test";
import {
  SKELETON_COLLECTION,
  SKELETON_FILE,
  SKELETON_IMAGE,
  SKELETON_NOTE,
  SKELETON_SNIPPET,
} from "../scripts/e2e-skeleton-user";
import { LOCALE_COOKIE } from "../src/i18n/config";
import { openDeletionLink } from "./support/deletion-link";
import { signInFreshUser } from "./support/fresh-user";
import type { HeldTable } from "./support/held/hold-reads";
import { expectSameBlocks, measureSettled } from "./support/held/blocks";
import { now, trackLayoutShifts } from "./support/held/layout-shifts";
import {
  expectInPlace,
  expectSameLook,
  lookOf,
  measureHeld,
  newItemPlaceholder,
  skeletonIn,
  type InPlace,
} from "./support/held/placeholders";
import {
  E2E_ORIGIN,
  OVER_LIMIT_AUTH_FILE,
  SIGNED_OUT,
  SKELETON_AUTH_FILE,
  VISUAL_AUTH_FILE,
} from "./support/storage-state";
import { PAINTED_THEMES, startInTheme } from "./support/theme";
import { PHONE, VIEWPORTS } from "./support/held/viewports";

// Every loading.tsx of the app and every Suspense fallback, against the page
// that replaces it (spec 27): the read is held back, the skeleton measured,
// the answer let through and the page measured, on a desktop and a phone, in
// both themes. The boxes are the proof; a layout shift is reported only of
// nodes that stay on the page and move (the top bar, the footer), from the start
// of the document or the click.
//
// Not held apart, because no read can do it:
// - items/[type]'s inner Suspense: the page counts items before it, so "Item"
//   holds both. It is the same ListingSkeleton as in loading.tsx
// - collections and collections/[id]: their loading.tsx is the fallback of the
//   page's own Suspense, which is what shows
// - profile/loading.tsx: the page is synchronous, so its own fallbacks show,
//   the same two skeletons under the same header
// - dashboard/loading.tsx and the page's own fallbacks: the same skeletons, so
//   that the second case shows the page's own cannot be told apart
// - the client parts with a loading state of their own and no read of the
//   server: MarkdownPreview, the palette, the create form, AI answers
//
// Named exceptions:
// - `rows`: the lists whose number of rows is not known while they load
// - `depth`: the inside of a row or a card is not drawn, its box is
// - `text`: a note is as long as its text, and the content below it moves when
//   the Markdown parser has loaded ("content")
// - the Upgrade button of a Free user joins the top bar ("top bar")
// - a Pro user's /settings and one with custom types, a custom type's header
// - the row of kept files of a Free user in /settings and below /upgrade

type Target = (page: Page) => Locator;

type Case = {
  name: string;
  storageState: string;
  /** Where the page is, or how to find out on another page. */
  path: string | ((page: Page) => Promise<string>);
  holds: HeldTable[];
  /** On screen only with the answer. */
  settled: Target;
  /** On screen only in this state, not in the loading.tsx before it. */
} & Pick<InPlace, "rows" | "text" | "depth" | "mayShift"> & { held?: Target };

// The page, without the footer that follows it.
const pageRoot: Target = (page) =>
  page.getByRole("main").locator(":scope > div").first();

const heading =
  (name: string | RegExp): Target =>
  (page) =>
    page.getByRole("heading", { name, exact: true }).first();

const firstSelect: Target = (page) =>
  page.getByRole("main").getByRole("combobox").first();

// A card or a row that shows this text.
const linkTo = (page: Page, text: string) =>
  page.getByRole("main").getByRole("link").filter({ hasText: text }).first();

// The path of the first link on a list page that shows this text.
const linkOn =
  (listPath: string, name: string) =>
  async (page: Page): Promise<string> => {
    await page.goto(listPath);
    const link = linkTo(page, name);
    const href = await link.getAttribute("href");
    expect(href).not.toBeNull();
    return href ?? "";
  };

// Ten items, and a skeleton of five rows.
const RECENT_ITEMS = ["section:5 > div:2"];

const CASES: Case[] = [
  {
    name: "dashboard, loading.tsx",
    storageState: SKELETON_AUTH_FILE,
    path: "/dashboard",
    holds: ["User"],
    settled: heading("Recent Items"),
    rows: RECENT_ITEMS,
    depth: 4,
    mayShift: ["footer"],
  },
  {
    name: "dashboard, its sections",
    storageState: SKELETON_AUTH_FILE,
    path: "/dashboard",
    holds: ["Item", "Collection"],
    settled: heading("Recent Items"),
    rows: RECENT_ITEMS,
    depth: 4,
    mayShift: ["footer"],
  },
  {
    name: "profile",
    storageState: SKELETON_AUTH_FILE,
    path: "/profile",
    holds: ["User"],
    settled: heading(/^Usage/),
  },
  {
    name: "settings, Free",
    storageState: VISUAL_AUTH_FILE,
    path: "/settings",
    holds: ["User"],
    settled: (page) => page.getByLabel("Current password"),
    mayShift: ["top bar"],
  },
  {
    name: "upgrade",
    storageState: VISUAL_AUTH_FILE,
    path: "/upgrade",
    holds: ["User"],
    settled: (page) => page.getByRole("switch"),
    mayShift: ["top bar"],
  },
  {
    name: "favorites",
    storageState: SKELETON_AUTH_FILE,
    path: "/favorites",
    holds: ["User"],
    settled: firstSelect,
    depth: 5,
  },
  {
    name: "pinned",
    storageState: SKELETON_AUTH_FILE,
    path: "/pinned",
    holds: ["User"],
    settled: firstSelect,
    rows: ["div:2", "section:2 > div:2"],
    depth: 5,
    mayShift: ["footer"],
  },
  ...(["snippets", "files", "images"] as const).map((slug) => ({
    name: `items/${slug}`,
    storageState: SKELETON_AUTH_FILE,
    path: `/items/${slug}`,
    holds: ["User"] satisfies HeldTable[],
    settled: firstSelect,
    depth: slug === "images" ? 3 : 4,
  })),
  {
    name: "a note, its own page",
    storageState: SKELETON_AUTH_FILE,
    path: linkOn("/items/notes", SKELETON_NOTE),
    holds: ["User"],
    settled: heading(SKELETON_NOTE),
    text: true,
    mayShift: ["footer", "content"],
  },
  ...(
    [
      ["files", SKELETON_FILE],
      ["images", SKELETON_IMAGE],
    ] as const
  ).map(([slug, title]) => ({
    name: `${slug}, an item's own page`,
    storageState: SKELETON_AUTH_FILE,
    path: linkOn(`/items/${slug}`, title),
    holds: ["User"] satisfies HeldTable[],
    settled: heading(title),
    depth: 4,
  })),
  {
    name: "collections",
    storageState: SKELETON_AUTH_FILE,
    path: "/collections",
    holds: ["User"],
    settled: heading(SKELETON_COLLECTION),
    depth: 4,
  },
  {
    name: "a collection",
    storageState: SKELETON_AUTH_FILE,
    path: linkOn("/collections", SKELETON_COLLECTION),
    holds: ["User"],
    settled: heading(SKELETON_COLLECTION),
    depth: 4,
  },
  {
    name: "locked files, loading.tsx",
    storageState: OVER_LIMIT_AUTH_FILE,
    path: "/settings/locked-files",
    holds: ["User"],
    settled: (page) => page.getByRole("link", { name: /^Download / }).first(),
    mayShift: ["top bar"],
  },
  {
    name: "locked files, the list",
    storageState: OVER_LIMIT_AUTH_FILE,
    path: "/settings/locked-files",
    holds: ["Item"],
    // Only the page offers to renew.
    held: (page) =>
      page.getByRole("main").getByRole("link", { name: /^Renew/ }),
    settled: (page) => page.getByRole("link", { name: /^Download / }).first(),
    mayShift: ["top bar"],
  },
];

for (const viewport of VIEWPORTS) {
  test.describe(viewport.name, () => {
    test.use({ viewport: viewport.size });

    for (const {
      name,
      storageState,
      path,
      holds,
      settled,
      held,
      ...rest
    } of CASES) {
      test.describe(name, () => {
        test.use({ storageState });

        test("the skeleton has the boxes of the page", async ({
          page,
          holdReads,
        }) => {
          await trackLayoutShifts(page);
          const url = typeof path === "string" ? path : await path(page);
          const release = await holdReads(...holds);
          // Not "load": the document ends only with the held answer.
          await page.goto(url, { waitUntil: "commit" });
          await expectInPlace(page, {
            root: pageRoot(page),
            release,
            settled: settled(page),
            held: held?.(page),
            ...rest,
          });
        });
      });
    }

    test.describe("a working deletion link", () => {
      test.use({ storageState: SIGNED_OUT });

      test("the skeleton has the boxes of the page", async ({
        page,
        holdReads,
      }) => {
        const email = await signInFreshUser(page, "free");
        await trackLayoutShifts(page);
        const url = await openDeletionLink(email);
        const release = await holdReads("User");
        await page.goto(url, { waitUntil: "commit" });
        await expectInPlace(page, {
          root: pageRoot(page),
          release,
          settled: page.getByRole("button", { name: /^Delete/ }),
          mayShift: ["top bar"],
        });
      });
    });

    test.describe("the cancellation page", () => {
      test.use({ storageState: SIGNED_OUT });

      // The session of a guest reads no table, so nothing holds it: the
      // skeleton is measured as a signed-in visitor sees it, the form as a
      // guest. A signed-in visitor gets their contract instead of it, which
      // is shorter: two documents, so no shift is measured.
      test("the skeleton has the boxes of a guest's form", async ({
        page,
        browser,
        holdReads,
      }) => {
        const signedIn = await browser.newContext({
          storageState: VISUAL_AUTH_FILE,
          viewport: viewport.size,
          baseURL: E2E_ORIGIN,
        });
        const held = await signedIn.newPage();
        const release = await holdReads("User");
        const root: Target = (target) =>
          target.getByRole("main").locator(":scope > div");
        await held.goto("/vertraege-kuendigen", { waitUntil: "commit" });
        const before = await measureHeld(held, root(held));
        await release();
        await signedIn.close();

        await page.goto("/vertraege-kuendigen");
        await expect(page.getByRole("radio").first()).toBeVisible();
        const after = await measureSettled(page, root(page));
        expectSameBlocks(page, before, after);
      });
    });

    test.describe("the drawer of the items", () => {
      test.use({ storageState: SKELETON_AUTH_FILE });

      for (const [slug, title] of [
        ["notes", SKELETON_NOTE],
        ["files", SKELETON_FILE],
        ["images", SKELETON_IMAGE],
      ] as const) {
        test(`the skeleton has the boxes of ${slug}`, async ({
          page,
          holdReads,
        }) => {
          await trackLayoutShifts(page);
          await page.goto(`/items/${slug}`);
          const link = linkTo(page, title);
          await expect(link).toBeVisible();
          const release = await holdReads("User");
          const since = await now(page);
          await link.click();
          const drawer = page.getByRole("dialog");
          await expect(drawer).toBeVisible();
          await expectInPlace(page, {
            root: drawer,
            release,
            settled: drawer.getByRole("heading", { name: title, exact: true }),
            since,
            text: slug === "notes",
            mayShift: slug === "notes" ? ["content"] : [],
          });
        });
      }
    });

    test.describe("the sidebar", () => {
      test.use({ storageState: SIGNED_OUT });

      test("the skeleton has the boxes of the sidebar", async ({
        page,
        holdReads,
      }) => {
        await signInFreshUser(page, "sidebar");
        await trackLayoutShifts(page);
        const release = await holdReads("User");
        await page.goto("/profile", { waitUntil: "commit" });
        const root: Locator =
          viewport.name === "desktop"
            ? page.getByRole("complementary")
            : page.getByRole("dialog");
        if (viewport.name === "phone") {
          await expect(async () => {
            await page.getByRole("button", { name: "Open sidebar" }).click();
            await expect(root).toBeVisible({ timeout: 2_000 });
          }).toPass();
        }
        await expectInPlace(page, {
          root,
          release,
          settled: root.getByRole("link", { name: "DevStash" }),
          depth: 5,
        });
      });
    });
  });
}

// The words of these are long and wrap, so their skeletons are as large as the
// words: German wraps in other places than English.
test.describe("in German, on a phone", () => {
  test.use({
    viewport: PHONE,
    storageState: VISUAL_AUTH_FILE,
  });
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      { name: LOCALE_COOKIE, value: "de", url: E2E_ORIGIN },
    ]);
  });

  for (const { path, settled } of [
    {
      path: "/settings",
      settled: (page: Page) => page.getByLabel("Aktuelles Passwort"),
    },
    { path: "/upgrade", settled: (page: Page) => page.getByRole("switch") },
  ]) {
    test(`the skeleton has the boxes of ${path}`, async ({
      page,
      holdReads,
    }) => {
      await trackLayoutShifts(page);
      const release = await holdReads("User");
      await page.goto(path, { waitUntil: "commit" });
      await expectInPlace(page, {
        root: pageRoot(page),
        release,
        settled: settled(page),
        mayShift: ["top bar"],
      });
    });
  }
});

// The same states after a click: the page before stays until the new one's
// loading state comes, and the shell around both does not move.
test.describe("after a click", () => {
  test.use({ storageState: SKELETON_AUTH_FILE });

  const CLICKS: {
    name: string;
    link: string;
    settled: Target;
    rows?: string[];
  }[] = [
    {
      name: "dashboard",
      link: "DevStash",
      settled: heading("Recent Items"),
      rows: RECENT_ITEMS,
    },
    {
      name: "items/snippets",
      link: "Snippets",
      settled: heading(SKELETON_SNIPPET),
    },
  ];
  for (const { name, link, settled, rows } of CLICKS) {
    test(`the skeleton has the boxes of ${name}`, async ({
      page,
      holdReads,
    }) => {
      await trackLayoutShifts(page);
      await page.goto("/favorites");
      await expect(firstSelect(page)).toBeVisible();
      const release = await holdReads("User");
      const since = await now(page);
      await page
        .getByRole("complementary")
        .getByRole("link", { name: new RegExp(`^${link}`) })
        .click();
      await expectInPlace(page, {
        root: pageRoot(page),
        release,
        settled: settled(page),
        since,
        rows,
        depth: 4,
        mayShift: rows ? ["footer"] : [],
      });
    });
  }

  test("the skeletons have the boxes of the profile", async ({
    page,
    holdReads,
  }) => {
    await trackLayoutShifts(page);
    await page.goto("/favorites");
    await expect(firstSelect(page)).toBeVisible();
    const menuItem = page.getByRole("menuitem", { name: "Profile" });
    await expect(async () => {
      await page
        .getByRole("complementary")
        .getByRole("button", { name: /E2E Tester/ })
        .click();
      await expect(menuItem).toBeVisible({ timeout: 2_000 });
    }).toPass();
    const release = await holdReads("User");
    const since = await now(page);
    await menuItem.click();
    await expectInPlace(page, {
      root: pageRoot(page),
      release,
      since,
      settled: heading(/^Usage/)(page),
    });
  });
});

// The top bar waits for the plan: the create button's placeholder has its look,
// and the buttons beside it keep their place for a Free user, whose Upgrade
// button joins at the left, and for a Pro user, who has none. The search field
// takes what the bar leaves it, so below the width of 1280 it alone gives way.
for (const { name, storageState, hasUpgrade } of [
  { name: "Free", storageState: VISUAL_AUTH_FILE, hasUpgrade: true },
  { name: "Pro", storageState: SKELETON_AUTH_FILE, hasUpgrade: false },
]) {
  for (const width of [1280, 1024, 375]) {
    for (const theme of PAINTED_THEMES) {
      test.describe(`the top bar, ${name}, ${width}px, ${theme}`, () => {
        test.use({ storageState, viewport: { width, height: 800 } });

        test("keeps the place of its buttons", async ({ page, holdReads }) => {
          await startInTheme(page, theme);
          const release = await holdReads("User");
          await page.goto("/profile", { waitUntil: "commit" });
          const placeholder = newItemPlaceholder(page);
          await expect(placeholder).toBeVisible();
          const bar = page.getByRole("banner");
          const kept = [
            bar.getByRole("link", { name: "Favorites" }),
            bar.getByRole("link", { name: "Pinned" }),
          ];
          const looks = () => Promise.all(kept.map(lookOf));
          const createBefore = await lookOf(placeholder);
          const keptBefore = await looks();

          await release();
          const create = bar.getByRole("button", {
            name: width < 640 ? "Create" : "New item",
            exact: true,
          });
          await expect(create).toBeVisible();
          await expect(
            bar
              .getByRole("link", { name: /^Upgrade/ })
              .filter({ visible: true }),
          ).toHaveCount(hasUpgrade ? 1 : 0);
          const createAfter = await lookOf(create);
          expectSameLook(createBefore, createAfter);
          expect(createBefore.width).toBeCloseTo(createAfter.width, 1);
          expect(await looks()).toEqual(keptBefore);
        });
      });
    }
  }
}

// The code editor waits for the user's editor preferences, which come with the
// shell. The read view starts at its smallest and grows with the code (a named
// exception): what is above it keeps its place.
test.describe("the code editor", () => {
  test.use({ storageState: SKELETON_AUTH_FILE });

  test("the fallback stands where the editor stands", async ({
    page,
    holdReads,
  }) => {
    const url = await linkOn("/items/snippets", SKELETON_SNIPPET)(page);
    const release = await holdReads("UserPreference");
    await page.goto(url, { waitUntil: "commit" });
    const main = page.getByRole("main");
    const fallback = skeletonIn(main);
    await expect(fallback).toBeVisible();
    const copy = main.getByRole("button", { name: "Copy code" });
    await expect(copy).toBeVisible();
    const before = await lookOf(fallback);
    const copyBefore = await lookOf(copy);

    await release();
    const code = main.getByRole("code").first();
    await expect(code).toBeVisible();
    const after = await lookOf(code);
    expect((await lookOf(copy)).top).toBe(copyBefore.top);
    expect(after.top).toBeCloseTo(before.top, 0);
    expect(after.left).toBeCloseTo(before.left, 0);
    expect(after.height).toBeGreaterThanOrEqual(before.height);
  });
});
