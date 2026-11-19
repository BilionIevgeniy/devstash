import { describe, expect, it } from "vitest";
import { rewriteBody, rewriteScript } from "./fake-upstash";

describe("rewriteScript", () => {
  it("drops the one Upstash flag that plain Redis refuses", () => {
    expect(rewriteScript("#!lua flags=allow-key-locking\nreturn 1")).toEqual({
      script: "#!lua\nreturn 1",
    });
  });

  it("leaves a script with no shebang or a bare one as it is", () => {
    expect(rewriteScript("return 1")).toEqual({ script: "return 1" });
    expect(rewriteScript("#!lua\nreturn 1")).toEqual({
      script: "#!lua\nreturn 1",
    });
  });

  it("refuses any other flag, so a new one fails loudly", () => {
    const result = rewriteScript(
      "#!lua flags=allow-key-locking,no-writes\nreturn 1",
    );
    expect(result).toEqual({
      error: expect.stringContaining("allow-key-locking,no-writes"),
    });
  });

  it("touches only the first line", () => {
    const script =
      "#!lua flags=allow-key-locking\n-- #!lua flags=allow-key-locking\nreturn 1";
    expect(rewriteScript(script)).toEqual({
      script: "#!lua\n-- #!lua flags=allow-key-locking\nreturn 1",
    });
  });
});

describe("rewriteBody", () => {
  const FLAGGED = "#!lua flags=allow-key-locking\nreturn 1";

  it("rewrites an EVAL sent alone and leaves other commands", () => {
    expect(rewriteBody("/", ["EVAL", FLAGGED, 0])).toEqual({
      body: ["EVAL", "#!lua\nreturn 1", 0],
    });
    expect(rewriteBody("/", ["SET", "k", "v"])).toEqual({
      body: ["SET", "k", "v"],
    });
  });

  it("rewrites every EVAL of a pipeline and a transaction", () => {
    for (const path of ["/pipeline", "/multi-exec"]) {
      expect(
        rewriteBody(path, [
          ["eval", FLAGGED, 0],
          ["INCR", "c"],
        ]),
      ).toEqual({
        body: [
          ["eval", "#!lua\nreturn 1", 0],
          ["INCR", "c"],
        ],
      });
    }
  });

  it("refuses a batch that holds an unknown flag", () => {
    expect(
      rewriteBody("/pipeline", [
        ["EVAL", "#!lua flags=no-writes\nreturn 1", 0],
      ]),
    ).toHaveProperty("error");
  });
});
