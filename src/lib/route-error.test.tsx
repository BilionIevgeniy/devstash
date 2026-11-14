import { describe, expect, it } from "vitest";

import { readRouteData, RouteError, routeError } from "@/lib/route-error";

describe("routeError", () => {
  it("reads the route's code and params from a JSON answer", async () => {
    const response = Response.json(
      { success: false, error: "tooManyAttempts", params: { minutes: 2 } },
      { status: 429 },
    );
    await expect(routeError(response, "generic")).resolves.toEqual({
      success: false,
      data: null,
      error: "tooManyAttempts",
      params: { minutes: 2 },
    });
  });

  it("drops params that are not plain values", async () => {
    const response = Response.json(
      { error: "tooManyAttempts", params: { minutes: { nested: 1 } } },
      { status: 429 },
    );
    await expect(routeError(response, "generic")).resolves.toEqual({
      success: false,
      data: null,
      error: "tooManyAttempts",
    });
  });

  it("falls back on a body that is not JSON, carries no error or an unknown code", async () => {
    const html = new Response("<html>502</html>", { status: 502 });
    await expect(routeError(html, "aiUnavailable")).resolves.toHaveProperty(
      "error",
      "aiUnavailable",
    );
    const other = Response.json({ message: "x" }, { status: 500 });
    await expect(routeError(other, "generic")).resolves.toHaveProperty(
      "error",
      "generic",
    );
    const unknown = Response.json({ error: "Too many" }, { status: 429 });
    await expect(routeError(unknown, "generic")).resolves.toHaveProperty(
      "error",
      "generic",
    );
  });
});

describe("readRouteData", () => {
  it("gives the data of a successful answer", async () => {
    const response = Response.json({
      success: true,
      data: [1, 2],
      error: null,
    });
    await expect(readRouteData<number[]>(response)).resolves.toEqual([1, 2]);
  });

  it("throws a refusal with its status and code", async () => {
    const response = Response.json(
      { success: false, data: null, error: "itemNotFound" },
      { status: 404 },
    );
    const error: unknown = await readRouteData(response).catch((e) => e);
    expect(error).toBeInstanceOf(RouteError);
    expect(error).toMatchObject({
      status: 404,
      failure: { error: "itemNotFound" },
    });
  });

  it("throws the generic code for a platform error page", async () => {
    const response = new Response("<html>502</html>", { status: 502 });
    await expect(readRouteData(response)).rejects.toMatchObject({
      status: 502,
      failure: { error: "generic" },
    });
  });

  it("throws for a 200 whose body says it failed", async () => {
    const response = Response.json({
      success: false,
      data: null,
      error: "generic",
    });
    await expect(readRouteData(response)).rejects.toMatchObject({
      status: 200,
    });
  });
});
