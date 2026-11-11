import { describe, expect, it } from "vitest";
import { headObject } from "@/lib/r2";
import { prisma } from "@/lib/prisma";

// Pins the harness itself: if the worker's DATABASE_URL, the migrations or the
// shared mocks stop applying, every other integration test would test the
// wrong thing.
describe("integration test harness", () => {
  it("connects the app's Prisma client to the test database", async () => {
    const [row] = await prisma.$queryRaw<{ db: string }[]>`
      SELECT current_database() AS db
    `;
    const url = process.env.DATABASE_URL ?? "";
    expect(url).not.toBe("");
    expect(url).toBe(process.env.TEST_DATABASE_URL);
    expect(row.db).toBe(new URL(url).pathname.slice(1));
  });

  it("runs on a migrated schema", async () => {
    const [row] = await prisma.$queryRaw<{ pending: number }[]>`
      SELECT count(*)::int AS pending FROM "_prisma_migrations"
      WHERE finished_at IS NULL
    `;
    expect(row.pending).toBe(0);
    await expect(prisma.item.count()).resolves.toBeTypeOf("number");
  });

  it("replaces the vendors with the shared mocks", async () => {
    await expect(headObject("users/x/file.png")).resolves.toBeNull();
    await expect(fetch("https://example.com")).rejects.toThrow(
      "fetch is not allowed",
    );
  });
});
