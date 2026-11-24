import { expect, test } from "./support/test";
import { uniqueTitle } from "./support/items";
import { SIGNED_OUT } from "./support/storage-state";

// ADR 0032: the order step before Stripe, the terms, and the § 312k
// cancellation. Stripe's own page is not automated: the test server runs on a
// dummy key, so the order stops before it.

const CANCEL_NOW = "Jetzt kündigen / Cancel now";

test("the order step asks for both consents before it orders", async ({
  page,
}) => {
  await page.goto("/upgrade");
  const dialog = page.getByRole("dialog", { name: "Review your order" });
  await expect(async () => {
    await page.getByRole("button", { name: "Upgrade to Pro" }).click();
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  }).toPass();

  await expect(dialog.getByText("€8 per month")).toBeVisible();
  const order = dialog.getByRole("button", { name: "Order and pay" });
  await expect(order).toBeDisabled();
  await dialog.getByRole("checkbox", { name: /terms and conditions/ }).check();
  await expect(order).toBeDisabled();
  await dialog.getByRole("checkbox", { name: /start right away/ }).check();
  await expect(order).toBeEnabled();
});

test("a signed-in user with no running contract has nothing to cancel", async ({
  page,
}) => {
  await page.goto("/vertraege-kuendigen");

  await expect(
    page.getByText("Unter deinem Konto läuft kein Abonnement.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: CANCEL_NOW })).toHaveCount(0);
});

test.describe("signed out", () => {
  test.use({ storageState: SIGNED_OUT });

  test("the terms and the cancellation link are on the page", async ({
    page,
  }) => {
    await page.goto("/agb");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Allgemeine Geschäftsbedingungen/,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /Widerrufsbelehrung: Muster-Widerrufsformular/,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Verträge hier kündigen" }),
    ).toHaveAttribute("href", "/vertraege-kuendigen");
  });

  test("a declaration is taken and recorded for any address", async ({
    page,
  }) => {
    await page.context().setExtraHTTPHeaders({
      "x-forwarded-for": `203.0.113.${1 + Math.floor(Math.random() * 254)}`,
    });
    await page.goto("/vertraege-kuendigen");
    await page.getByLabel("Name / Name").fill("E2E Visitor");
    await page
      .getByLabel(
        "E-Mail-Adresse deines Kontos / Email address of your account",
      )
      .fill(`${uniqueTitle("nobody").replace(" ", "-")}@example.com`);
    // A click before React has hydrated the form posts it without script,
    // which shows no record; the action itself is the same.
    await expect(async () => {
      await page.getByRole("button", { name: CANCEL_NOW }).click();
      await expect(
        page.getByRole("heading", {
          name: "Kündigung eingegangen / Cancellation received",
        }),
      ).toBeVisible({ timeout: 3_000 });
    }).toPass();
    await expect(
      page.getByText(/Eingegangen am .* \/ Received on/),
    ).toBeVisible();
  });
});
