import { describe, expect, it } from "vitest";
import { decideMigration } from "./migration-guard";

const DEV = "ep-calm-voice-b4zvdl6z.c-6.us-east-2.aws.neon.tech";
const DEV_POOLER = "ep-calm-voice-b4zvdl6z-pooler.c-6.us-east-2.aws.neon.tech";
const PROD = "ep-twilight-hat-b4ay1zs8.c-6.us-east-2.aws.neon.tech";
const PROD_POOLER =
  "ep-twilight-hat-b4ay1zs8-pooler.c-6.us-east-2.aws.neon.tech";
const OTHER = "ep-other-branch-b4aaaaaa.c-6.us-east-2.aws.neon.tech";

function url(host: string, database = "neondb"): string {
  return `postgresql://user:secret@${host}/${database}?sslmode=require`;
}

describe("decideMigration", () => {
  it("migrates production on the production endpoint", () => {
    expect(
      decideMigration({
        vercelEnv: "production",
        directUrl: url(PROD),
        databaseUrl: url(PROD_POOLER),
      }),
    ).toEqual({ migrate: true, vercelEnv: "production", host: PROD });
  });

  it("migrates a preview on the development endpoint", () => {
    expect(
      decideMigration({
        vercelEnv: "preview",
        directUrl: url(DEV),
        databaseUrl: url(DEV_POOLER),
      }),
    ).toEqual({ migrate: true, vercelEnv: "preview", host: DEV });
  });

  it("accepts a direct DATABASE_URL on the same endpoint", () => {
    expect(
      decideMigration({
        vercelEnv: "preview",
        directUrl: url(DEV),
        databaseUrl: url(DEV),
      }).migrate,
    ).toBe(true);
  });

  it("refuses a preview pointed at production", () => {
    expect(
      decideMigration({
        vercelEnv: "preview",
        directUrl: url(PROD),
        databaseUrl: url(PROD_POOLER),
      }),
    ).toEqual({
      migrate: false,
      reason: `preview must migrate ${DEV}, not ${PROD}`,
    });
  });

  it("refuses production on any endpoint but its own", () => {
    for (const host of [DEV, OTHER]) {
      expect(
        decideMigration({
          vercelEnv: "production",
          directUrl: url(host),
          databaseUrl: url(host),
        }).migrate,
      ).toBe(false);
    }
  });

  it("refuses a runtime URL on another endpoint or database", () => {
    const mixed = [url(PROD_POOLER), url(DEV_POOLER, "otherdb")];
    for (const databaseUrl of mixed) {
      expect(
        decideMigration({
          vercelEnv: "preview",
          directUrl: url(DEV),
          databaseUrl,
        }),
      ).toEqual({
        migrate: false,
        reason: "DIRECT_URL and DATABASE_URL point at different databases",
      });
    }
  });

  it("refuses a pooled DIRECT_URL", () => {
    expect(
      decideMigration({
        vercelEnv: "preview",
        directUrl: url(DEV_POOLER),
        databaseUrl: url(DEV_POOLER),
      }).migrate,
    ).toBe(false);
  });

  it("refuses outside production and preview", () => {
    for (const vercelEnv of [undefined, "development", ""]) {
      expect(
        decideMigration({
          vercelEnv,
          directUrl: url(DEV),
          databaseUrl: url(DEV),
        }).migrate,
      ).toBe(false);
    }
  });

  it("refuses missing or invalid URLs", () => {
    for (const directUrl of [undefined, "not a url"]) {
      expect(
        decideMigration({
          vercelEnv: "preview",
          directUrl,
          databaseUrl: url(DEV),
        }).migrate,
      ).toBe(false);
    }
  });

  it("never puts a password in the reason", () => {
    const decision = decideMigration({
      vercelEnv: "preview",
      directUrl: url(PROD),
      databaseUrl: url(PROD),
    });
    expect(JSON.stringify(decision)).not.toContain("secret");
  });
});
