import { expect, test } from "./support/test";
import { holdRoute } from "./support/held/hold-route";
import { waitForAnswers } from "./support/network";
import { linkSpinner, lookOf } from "./support/held/placeholders";
import { PAINTED_THEMES, startInTheme } from "./support/theme";
import { VIEWPORTS } from "./support/held/viewports";

// The app's shell is not prefetched (ADR 0037), so a click on a homepage button
// shows nothing until the server has answered. The answer of /dashboard is held
// back: the button must show a spinner and keep its size (PendingLinkLabel).
// Nothing is held of the prefetches, which leave with their own header.

for (const theme of PAINTED_THEMES) {
  for (const { name, size } of VIEWPORTS) {
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

        const release = await holdRoute(
          page,
          /\/dashboard/,
          async (request) => {
            const headers = await request.allHeaders();
            return "rsc" in headers && !("next-router-prefetch" in headers);
          },
        );
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

        await release();
        await expect(page).toHaveURL(/\/dashboard$/);
      });
    });
  }
}
