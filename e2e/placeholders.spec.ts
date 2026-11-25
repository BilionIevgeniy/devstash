import { expect, test } from "./support/test";
import {
  actionPlaceholder,
  expectSameLook,
  holdSessionAnswer,
  lookOf,
  menuRowPlaceholder,
  navbarPlaceholder,
} from "./support/placeholders";
import { SIGNED_OUT } from "./support/storage-state";
import { PAINTED_THEMES, startInTheme } from "./support/theme";

// The homepage is static and learns of the session after it has painted
// (ADR 0037). Until the answer, a placeholder holds the place of each action
// that depends on it, and it must have the size and look of the button that
// replaces it ("No flash of the wrong state" in coding-standards.md). The
// loading states of the app are in skeletons.spec.ts.

const ANSWERS = [
  {
    name: "a guest",
    storageState: SIGNED_OUT,
    navbarButton: "Get Started",
    heroButton: "Get Started Free",
    freeButton: "Get Started",
    freeIndex: 0,
  },
  {
    name: "a signed-in visitor",
    storageState: undefined,
    navbarButton: "Dashboard",
    heroButton: "Open Dashboard",
    freeButton: "Open Dashboard",
    // After the hero's, before the one of the closing section.
    freeIndex: 1,
  },
] as const;

const VIEWPORTS = [
  { name: "desktop", size: { width: 1280, height: 800 } },
  { name: "phone", size: { width: 375, height: 800 } },
] as const;

for (const theme of PAINTED_THEMES) {
  for (const viewport of VIEWPORTS) {
    for (const answer of ANSWERS) {
      test.describe(`${theme}, ${viewport.name}, ${answer.name}`, () => {
        test.use({
          viewport: viewport.size,
          ...(answer.storageState ? { storageState: answer.storageState } : {}),
        });

        test("the placeholders look like the buttons that replace them", async ({
          page,
        }) => {
          await startInTheme(page, theme);
          const release = await holdSessionAnswer(page);
          await page.goto("/");

          const navbarBefore = await lookOf(navbarPlaceholder(page));
          const guestLink = (name: string) =>
            page
              .getByRole("main")
              .getByRole("link", { name, exact: true, includeHidden: true })
              .first();
          const heroBefore = await lookOf(
            actionPlaceholder(guestLink("Get Started Free")),
          );
          // The plan cards: the guest's link of each names its button.
          const freeBefore = await lookOf(
            actionPlaceholder(guestLink("Get Started")),
          );
          const proBefore = await lookOf(
            actionPlaceholder(guestLink("Go Pro")),
          );

          await release();
          const navbarButton = page
            .getByRole("banner")
            .getByRole("link", { name: answer.navbarButton, exact: true });
          const heroButton = page
            .getByRole("main")
            .getByRole("link", { name: answer.heroButton, exact: true })
            .first();
          await expect(navbarButton).toBeVisible();
          await expect(heroButton).toBeVisible();

          expectSameLook(navbarBefore, await lookOf(navbarButton));
          expectSameLook(heroBefore, await lookOf(heroButton));

          const main = page.getByRole("main");
          const planButton = (name: string) =>
            main
              .getByRole("link", { name, exact: true })
              .filter({ visible: true });
          expectSameLook(
            freeBefore,
            await lookOf(planButton(answer.freeButton).nth(answer.freeIndex)),
          );
          expectSameLook(proBefore, await lookOf(planButton("Go Pro").first()));
        });
      });
    }
  }
}

// The row of a text link, whose look without its text is nothing: a muted bar
// holds its place. It comes last, so nothing moves when the answer takes it.
for (const theme of PAINTED_THEMES) {
  for (const answer of ANSWERS) {
    test.describe(`the phone menu, ${theme}, ${answer.name}`, () => {
      test.use({
        viewport: { width: 375, height: 800 },
        ...(answer.storageState ? { storageState: answer.storageState } : {}),
      });

      test("the last row keeps its place until the answer", async ({
        page,
      }) => {
        await startInTheme(page, theme);
        const release = await holdSessionAnswer(page);
        await page.goto("/");
        const menu = page.getByRole("navigation", { name: "Mobile" });
        await expect(async () => {
          await page.getByRole("button", { name: "Open menu" }).click();
          await expect(menu).toBeVisible({ timeout: 2_000 });
        }).toPass();

        const before = await lookOf(menuRowPlaceholder(menu));
        const links = menu.getByRole("link");
        const tops = async () =>
          Promise.all(
            (await links.all()).slice(0, 3).map(async (link) => {
              const { top, height } = await lookOf(link);
              return [top, height];
            }),
          );
        const topsBefore = await tops();

        await release();
        const signIn = menu.getByRole("link", { name: "Sign In", exact: true });
        if (answer.name === "a guest") {
          await expect(signIn).toBeVisible();
          const after = await lookOf(signIn);
          expect(after.top).toBe(before.top);
          expect(after.height).toBe(before.height);
        } else {
          await expect(menuRowPlaceholder(menu)).toHaveCount(0);
          await expect(signIn).toBeHidden();
        }
        expect(await tops()).toEqual(topsBefore);
      });
    });
  }
}
