import { describe, expect, it } from "vitest";
import {
  isDevDatabase,
  isTestDatabase,
  requireDevDatabase,
  requireTestDatabase,
} from "./require-dev-database";

const DEV_HOST = "ep-calm-voice-b4zvdl6z.c-6.us-east-2.aws.neon.tech";
const PROD_HOST = "ep-twilight-hat-b4ay1zs8.c-6.us-east-2.aws.neon.tech";
const TEST_BRANCH_HOST = "ep-test-branch-a1b2c3.c-6.us-east-2.aws.neon.tech";

function url(host: string): string {
  return `postgresql://user:secret@${host}/neondb?sslmode=require`;
}

describe("isDevDatabase", () => {
  it("is true only for the development endpoint", () => {
    expect(
      isDevDatabase(url("ep-calm-voice-b4zvdl6z.c-6.us-east-2.aws.neon.tech")),
    ).toBe(true);
    expect(
      isDevDatabase(
        url("ep-twilight-hat-b4ay1zs8.c-6.us-east-2.aws.neon.tech"),
      ),
    ).toBe(false);
  });

  it("is true for the pooled host of the development endpoint", () => {
    expect(
      isDevDatabase(
        url("ep-calm-voice-b4zvdl6z-pooler.c-6.us-east-2.aws.neon.tech"),
      ),
    ).toBe(true);
    expect(
      isDevDatabase(
        url("ep-twilight-hat-b4ay1zs8-pooler.c-6.us-east-2.aws.neon.tech"),
      ),
    ).toBe(false);
  });

  it("is false for a host that only contains the development one", () => {
    expect(
      isDevDatabase(
        url("ep-calm-voice-b4zvdl6z.c-6.us-east-2.aws.neon.tech.example.com"),
      ),
    ).toBe(false);
  });
});

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

describe("isTestDatabase", () => {
  it("is true for a local Postgres without any configuration", () => {
    expect(isTestDatabase(url("localhost:5433"))).toBe(true);
    expect(isTestDatabase(url("127.0.0.1:5432"))).toBe(true);
  });

  it("is true for the configured host only", () => {
    expect(isTestDatabase(url(TEST_BRANCH_HOST), TEST_BRANCH_HOST)).toBe(true);
    expect(isTestDatabase(url(TEST_BRANCH_HOST))).toBe(false);
    expect(
      isTestDatabase(url(`${TEST_BRANCH_HOST}.example.com`), TEST_BRANCH_HOST),
    ).toBe(false);
  });

  it("refuses the development and production endpoints even when configured", () => {
    expect(isTestDatabase(url(DEV_HOST), DEV_HOST)).toBe(false);
    expect(isTestDatabase(url(PROD_HOST), PROD_HOST)).toBe(false);
    const pooledProd = PROD_HOST.replace(/^([^.]+)\./, "$1-pooler.");
    expect(isTestDatabase(url(pooledProd), pooledProd)).toBe(false);
  });

  it("refuses a pooled host, which migrate deploy cannot use", () => {
    const pooled = TEST_BRANCH_HOST.replace(/^([^.]+)\./, "$1-pooler.");
    expect(isTestDatabase(url(pooled), pooled)).toBe(false);
  });
});

describe("requireTestDatabase", () => {
  it("returns the URL of a test database", () => {
    const local = url("localhost:5433");
    expect(requireTestDatabase(local, undefined)).toBe(local);
  });

  it("refuses when TEST_DATABASE_URL is not set", () => {
    expect(() => requireTestDatabase(undefined, undefined)).toThrow(
      "TEST_DATABASE_URL is not set",
    );
  });

  it("refuses the development database, naming the host but not the password", () => {
    expect(() => requireTestDatabase(url(DEV_HOST), undefined)).toThrow(
      new RegExp(`^Refusing to run: ${DEV_HOST} is not a test database$`),
    );
  });
});

describe("isTestDatabase against a hidden target", () => {
  it("refuses a host or hostaddr parameter, which pg connects to instead", () => {
    expect(isTestDatabase(`${url("localhost")}&host=${PROD_HOST}`)).toBe(false);
    expect(isTestDatabase(`${url("localhost")}&hostaddr=10.0.0.1`)).toBe(false);
  });

  it("refuses another name of the development or production endpoint", () => {
    const otherName = "ep-twilight-hat-b4ay1zs8.us-east-2.aws.neon.tech";
    expect(isTestDatabase(url(otherName), otherName)).toBe(false);
    const devOther = "ep-calm-voice-b4zvdl6z.us-east-2.aws.neon.tech";
    expect(isTestDatabase(url(devOther), devOther)).toBe(false);
  });

  it("refuses a malformed URL without printing it", () => {
    expect(() =>
      requireTestDatabase("postgresql://user:secret@[bad/db", undefined),
    ).toThrow(/^Refusing to run: TEST_DATABASE_URL is not a valid URL$/);
  });
});
