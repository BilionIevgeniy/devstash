import { describe, expect, it } from "vitest";

import { routeErrorMessage } from "@/lib/route-error";

describe("routeErrorMessage", () => {
  it("reads the route's error from a JSON answer", async () => {
    const response = Response.json({ error: "Too many" }, { status: 429 });
    await expect(routeErrorMessage(response, "Fallback")).resolves.toBe(
      "Too many",
    );
  });

  it("falls back on a body that is not JSON or carries no error", async () => {
    const html = new Response("<html>502</html>", { status: 502 });
    await expect(routeErrorMessage(html, "Fallback")).resolves.toBe("Fallback");
    const other = Response.json({ message: "x" }, { status: 500 });
    await expect(routeErrorMessage(other, "Fallback")).resolves.toBe(
      "Fallback",
    );
  });
});
