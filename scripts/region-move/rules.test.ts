import { describe, expect, it } from "vitest";
import { DEV_DATABASE_HOST, PROD_DATABASE_HOST } from "../neon-endpoints";
import { differences, MOVE_HOSTS, parseConnection, pooled } from "./rules";

function url(host: string, rest = "/neondb?sslmode=require"): string {
  return `postgresql://owner:s%40cret@${host}${rest}`;
}

describe("MOVE_HOSTS", () => {
  it("copies each database into its own new endpoint", () => {
    expect(MOVE_HOSTS.development.target).toBe(DEV_DATABASE_HOST);
    expect(MOVE_HOSTS.production.target).toBe(PROD_DATABASE_HOST);
    const hosts = Object.values(MOVE_HOSTS).flatMap((h) => [
      h.source,
      h.target,
    ]);
    expect(new Set(hosts).size).toBe(4);
  });
});

describe("parseConnection", () => {
  const { target, source } = MOVE_HOSTS.production;

  it("reads the parts of the URL, decoded", () => {
    expect(parseConnection("TARGET_URL", url(target), target)).toEqual({
      host: target,
      port: 5432,
      user: "owner",
      password: "s@cret",
      database: "neondb",
      ssl: true,
    });
  });

  it("refuses the other side, the other environment and a pooled host", () => {
    const pooledHost = target.replace(".", "-pooler.");
    for (const host of [source, MOVE_HOSTS.development.target, pooledHost]) {
      expect(() => parseConnection("TARGET_URL", url(host), target)).toThrow(
        `TARGET_URL must be ${target}, not ${host}`,
      );
    }
  });

  it("connects to the host of the URL whatever its parameters say", () => {
    const hidden = url(target, `/neondb?host=${source}`);
    expect(parseConnection("TARGET_URL", hidden, target).host).toBe(target);
  });

  it("refuses a missing or incomplete URL without printing it", () => {
    for (const value of [
      undefined,
      "postgresql://owner:secret@[bad/db",
      `postgresql://owner@${target}/neondb`,
      url(target, ""),
    ]) {
      expect(() => parseConnection("TARGET_URL", value, target)).toThrow(
        /^TARGET_URL (is not set|is not a valid URL|needs a user, a password and a database)$/,
      );
    }
  });
});

describe("pooled", () => {
  it("names the pooled host of the same endpoint", () => {
    const direct = parseConnection(
      "TARGET_URL",
      url(DEV_DATABASE_HOST),
      DEV_DATABASE_HOST,
    );
    expect(pooled(direct).host).toBe(
      DEV_DATABASE_HOST.replace(".", "-pooler."),
    );
  });
});

describe("differences", () => {
  it("is empty for two equal sides", () => {
    expect(differences({ a: "1", b: "2" }, { b: "2", a: "1" })).toEqual([]);
  });

  it("names what differs, what is missing and what is new", () => {
    expect(
      differences(
        { same: "1", rows: "1", lost: "1" },
        { same: "1", rows: "2", extra: "1" },
      ),
    ).toEqual([
      "extra: only in the target",
      "lost: only in the source",
      "rows: differs",
    ]);
  });
});
