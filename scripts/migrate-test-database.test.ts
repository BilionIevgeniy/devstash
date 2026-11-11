import { execFileSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { migrateTestDatabase } from "./migrate-test-database";

vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));

const LOCAL_URL = "postgresql://postgres@localhost:5433/devstash_test";

describe("migrateTestDatabase", () => {
  beforeEach(() => {
    vi.mocked(execFileSync).mockReset();
    vi.stubEnv("TEST_DATABASE_HOST", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("runs nothing when the database is not a test database", () => {
    expect(() =>
      migrateTestDatabase("postgresql://user@db.example.com/devstash"),
    ).toThrow("db.example.com is not a test database");
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it("runs nothing when no URL is set", () => {
    expect(() => migrateTestDatabase(undefined)).toThrow(
      "TEST_DATABASE_URL is not set",
    );
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it("hands the test URL to Prisma as DATABASE_URL and DIRECT_URL", () => {
    migrateTestDatabase(LOCAL_URL);

    expect(execFileSync).toHaveBeenCalledWith(
      "npx",
      ["prisma", "migrate", "deploy"],
      expect.objectContaining({
        env: expect.objectContaining({
          DATABASE_URL: LOCAL_URL,
          DIRECT_URL: LOCAL_URL,
        }),
      }),
    );
  });

  it("reports what Prisma wrote when the migration fails", () => {
    vi.mocked(execFileSync).mockImplementation(() => {
      throw Object.assign(new Error("exit 1"), {
        stdout: "Prisma header\n",
        stderr: "P3009 failed migration",
      });
    });

    expect(() => migrateTestDatabase(LOCAL_URL)).toThrow(
      /prisma migrate deploy failed on the test database\nPrisma header\nP3009 failed migration/,
    );
  });
});
