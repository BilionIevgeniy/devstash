import { describe, expect, it } from "vitest";
import { requireDevDatabase } from "./require-dev-database";

function url(host: string): string {
  return `postgresql://user:secret@${host}/neondb?sslmode=require`;
}

describe("requireDevDatabase", () => {
  it("lets a script run on the development endpoint", () => {
    expect(() =>
      requireDevDatabase(
        url("ep-calm-voice-b4zvdl6z.c-6.us-east-2.aws.neon.tech"),
      ),
    ).not.toThrow();
  });

  it("refuses the production endpoint", () => {
    expect(() =>
      requireDevDatabase(
        url("ep-twilight-hat-b4ay1zs8.c-6.us-east-2.aws.neon.tech"),
      ),
    ).toThrow("is not the development database");
  });

  it("refuses a host that only contains the development one", () => {
    expect(() =>
      requireDevDatabase(
        url("ep-calm-voice-b4zvdl6z.c-6.us-east-2.aws.neon.tech.example.com"),
      ),
    ).toThrow("is not the development database");
  });

  it("never prints the password of the refused URL", () => {
    expect(() => requireDevDatabase(url("localhost"))).toThrow(
      /^Refusing to run: localhost is not the development database$/,
    );
  });
});
