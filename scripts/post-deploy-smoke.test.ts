import { describe, expect, it } from "vitest";
import { problemsOf, type Answer } from "./post-deploy-smoke";

const answer = (extra: Partial<Answer>): Answer => ({
  status: 200,
  headers: {},
  body: "",
  ...extra,
});

describe("problemsOf", () => {
  it("accepts an answer that meets every expectation", () => {
    expect(
      problemsOf(
        { path: "/", status: 200, headers: ["x-a"], body: "DevStash" },
        answer({ headers: { "x-a": "1" }, body: "<h1>DevStash</h1>" }),
      ),
    ).toEqual([]);
  });

  it("names each thing that is wrong", () => {
    expect(
      problemsOf(
        { path: "/", status: 200, headers: ["x-a"], body: "DevStash" },
        answer({ status: 500, body: "Internal error" }),
      ),
    ).toEqual([
      "status 500, expected 200",
      "no x-a header",
      'the body lacks "DevStash"',
    ]);
  });

  it("checks where a redirect leads, absolute or relative", () => {
    const expected = { path: "/dashboard", status: 307, location: "/sign-in" };
    expect(
      problemsOf(
        expected,
        answer({
          status: 307,
          headers: { location: "https://x.test/sign-in?callbackUrl=%2Fd" },
        }),
      ),
    ).toEqual([]);
    expect(
      problemsOf(
        expected,
        answer({ status: 307, headers: { location: "/error" } }),
      ),
    ).toEqual(['redirects to "/error", expected /sign-in']);
  });
});
