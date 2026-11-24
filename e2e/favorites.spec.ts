import type { Page } from "@playwright/test";
import { expect, test } from "./support/test";
import { signInFreshUser } from "./support/fresh-user";
import { createSnippet, itemLink, uniqueTitle } from "./support/items";
import { SIGNED_OUT } from "./support/storage-state";

// The star and the pin of an item, on a fresh user each (scripts/e2e-fixture.ts):
// the run's own user keeps its Free budget for the create journeys.
test.use({ storageState: SIGNED_OUT });

// The star of a card and the pin of the drawer (cards carry no pin).
test("a star and a pin survive a reload", async ({ page }) => {
  await signInFreshUser(page, "free");
  const title = uniqueTitle("Starred snippet");
  await createSnippet(page, title);

  const star = page.getByRole("button", { name: `Favorite ${title}` });
  await star.click();
  await expect(star).toHaveAttribute("aria-pressed", "true");
  // Saved once the override is gone: the value then comes from the server.
  await expect(star).toHaveAttribute("aria-disabled", "false");

  await itemLink(page, title).click();
  const drawer = page.getByRole("dialog", { name: title, exact: true });
  const pin = drawer.getByRole("button", { name: "Pin", exact: true });
  await pin.click();
  await expect(pin).toHaveAttribute("aria-pressed", "true");
  await expect(pin).toHaveAttribute("aria-disabled", "false");

  await page.goto("/items/snippets");
  await expect(star).toHaveAttribute("aria-pressed", "true");
  await itemLink(page, title).click();
  await expect(pin).toHaveAttribute("aria-pressed", "true");
});

// The answer of the action is replaced by a 500: the star shows at once, then
// falls back, and the failure is said.
test("a star the server fails to save falls back and says so", async ({
  page,
}) => {
  await signInFreshUser(page, "free");
  const title = uniqueTitle("Failing star");
  await createSnippet(page, title);
  const star = page.getByRole("button", { name: `Favorite ${title}` });

  let failed = false;
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (
      failed ||
      request.method() !== "POST" ||
      !request.headers()["next-action"]
    ) {
      await route.fallback();
      return;
    }
    failed = true;
    await route.fulfill({ status: 500, body: "Internal Server Error" });
  });

  await star.click();

  await expect(page.getByText("Couldn't update the favorite.")).toBeVisible();
  await expect(star).toHaveAttribute("aria-pressed", "false");
  expect(failed).toBe(true);
  await page.unrouteAll({ behavior: "wait" });
  await page.reload();
  await expect(star).toHaveAttribute("aria-pressed", "false");
});

// Records every value the drawer's star takes, across re-renders and a
// remount of the button, until the test reads it back.
async function recordDrawerStar(page: Page, dialogName: string): Promise<void> {
  await page.evaluate((name) => {
    const log: string[] = [];
    (window as unknown as { starLog: string[] }).starLog = log;
    const read = () => {
      const dialog = [...document.querySelectorAll('[role="dialog"]')].find(
        (element) =>
          element.getAttribute("aria-labelledby") &&
          document.getElementById(element.getAttribute("aria-labelledby") ?? "")
            ?.textContent === name,
      );
      const star = [
        ...(dialog?.querySelectorAll("button[aria-pressed]") ?? []),
      ].find((button) => button.textContent?.trim() === "Favorite");
      const value = star?.getAttribute("aria-pressed") ?? "absent";
      if (log.at(-1) !== value) log.push(value);
    };
    read();
    new MutationObserver(read).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-pressed", "aria-disabled"],
    });
  }, dialogName);
}

// The drawer shows its own copy of the item (useItemSheet), which onSaved
// updates after the action's await (use-optimistic-toggle.ts). If that copy
// lands after the optimistic override has gone, the star shows "not starred"
// for a moment. A final-state check passes either way, so every value the
// star takes is recorded, until the override is gone (aria-disabled="false")
// and a frame has painted.
// Checked once (2026-11-19): onSaved deferred past the end of the transition
// (a setTimeout) turns this test red. A plain onSaved(...) in place of
// startTransition(() => onSaved(...)) does not: React commits an update made
// after an await at once, before the transition ends.
test("the drawer's star never falls back while its save completes", async ({
  page,
}) => {
  await signInFreshUser(page, "free");
  const title = uniqueTitle("Steady star");
  await createSnippet(page, title);

  await page.goto("/dashboard");
  // The dashboard keeps buttons for its rows, with the title as a level-3
  // heading.
  await page
    .getByRole("button")
    .filter({
      has: page.getByRole("heading", { level: 3, name: title, exact: true }),
    })
    .click();
  const drawer = page.getByRole("dialog", { name: title, exact: true });
  const star = drawer.getByRole("button", { name: "Favorite", exact: true });
  await expect(star).toHaveAttribute("aria-pressed", "false");

  await recordDrawerStar(page, title);
  await star.click();
  await expect(star).toHaveAttribute("aria-pressed", "true");
  await expect(star).toHaveAttribute("aria-disabled", "false");
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(resolve)),
  );

  const log = await page.evaluate(
    () => (window as unknown as { starLog: string[] }).starLog,
  );
  expect(log.slice(log.indexOf("true"))).toEqual(["true"]);
});
