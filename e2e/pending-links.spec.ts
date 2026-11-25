import type { Route } from "@playwright/test";
import { expect, test } from "./support/test";
import { waitForAnswers } from "./support/network";
import { linkSpinner, lookOf } from "./support/placeholders";
import { PAINTED_THEMES, startInTheme } from "./support/theme";

// The app's shell is not prefetched (ADR 0037), so a click on a homepage button
// shows nothing until the server has answered. The answer of /dashboard is held
// back: the button must show a spinner and keep its size (PendingLinkLabel).
// Nothing is held of the prefetches, which leave with their own header.

for (const theme of PAINTED_THEMES) {
  for (const [name, size] of [
    ["desktop", { width: 1280, height: 800 }],
    ["phone", { width: 375, height: 800 }],
  ] as const) {
    test.describe(`${theme}, ${name}`, () => {
      test.use({ viewport: size });

      test("a button shows a spinner until its page comes", async ({
        page,
      }) => {
        await startInTheme(page, theme);
        await page.goto("/");
        const link = page
          .getByRole("banner")
          .getByRole("link", { name: "Dashboard", exact: true });
        await expect(link).toBeVisible();
        await waitForAnswers(page);

        const held: Route[] = [];
        let released = false;
        await page.route(/\/dashboard/, async (route) => {
          const headers = await route.request().allHeaders();
          const prefetch = "next-router-prefetch" in headers;
          if (released || prefetch || !("rsc" in headers)) {
            await route.continue();
          } else held.push(route);
        });
        const before = await lookOf(link);
        await link.click();
        const spinner = linkSpinner(link);
        // Faded in, after a moment.
        await expect
          .poll(() =>
            spinner.evaluate((element) => getComputedStyle(element).opacity),
          )
          .toBe("1");
        await expect(link).toHaveAccessibleName("Dashboard");
        const after = await lookOf(link);
        expect(after.width).toBe(before.width);
        expect(after.height).toBe(before.height);
        expect(after.left).toBe(before.left);

        await expect.poll(() => held.length).toBeGreaterThan(0);
        released = true;
        await Promise.all(held.map((route) => route.continue()));
        await expect(page).toHaveURL(/\/dashboard$/);
      });
    });
  }
}
