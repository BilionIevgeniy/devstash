import { expect, test } from "@playwright/test";

// What a crawler and a link preview see. A visitor has no session, so the
// app routes would only redirect: the noindex they carry is checked signed in.
test.describe("as a visitor", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the sitemap lists the public pages", async ({ request, baseURL }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.ok()).toBe(true);
    const body = await response.text();

    for (const path of ["/", "/de", "/impressum", "/datenschutz"]) {
      expect(body).toContain(`<loc>${baseURL}${path}</loc>`);
    }
    expect(body).not.toContain("/dashboard");
  });

  test("robots.txt closes only the API and names the sitemap", async ({
    request,
    baseURL,
  }) => {
    const body = await (await request.get("/robots.txt")).text();

    expect(body).toContain("Disallow: /api/");
    expect(body).toContain(`Sitemap: ${baseURL}/sitemap.xml`);
  });

  test("both homepages have an Open Graph image", async ({ page, request }) => {
    for (const path of ["/", "/de"]) {
      await page.goto(path);
      const image = await page
        .locator('meta[property="og:image"]')
        .getAttribute("content");
      expect(image).not.toBeNull();

      const response = await request.get(new URL(image ?? "").pathname);
      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toBe("image/png");
    }
  });

  test("the sign-in page is never indexed, by header", async ({ request }) => {
    const response = await request.get("/sign-in");

    expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  });

  test("the homepage may be indexed", async ({ request }) => {
    const response = await request.get("/");

    expect(response.headers()["x-robots-tag"]).toBeUndefined();
  });
});

test("an app page is never indexed, by header and by meta tag", async ({
  page,
}) => {
  const response = await page.goto("/dashboard");

  expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
});
