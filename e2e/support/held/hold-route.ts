import { expect, type Page, type Request, type Route } from "@playwright/test";

// Every answer of the pattern waits until the returned function runs; one asked
// for after that goes through at once. The handler stays: a route it caught and
// never continued would hang even after an unroute.
export async function holdRoute(
  page: Page,
  pattern: string | RegExp,
  isHeld: (request: Request) => Promise<boolean> = async () => true,
): Promise<() => Promise<void>> {
  const held: Route[] = [];
  let released = false;
  await page.route(pattern, async (route) => {
    if (released || !(await isHeld(route.request()))) await route.continue();
    else held.push(route);
  });
  return async () => {
    await expect.poll(() => held.length).toBeGreaterThan(0);
    released = true;
    await Promise.all(held.map((route) => route.continue()));
  };
}
