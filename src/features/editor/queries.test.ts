import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: { userPreference: { findUnique } },
}));

import { DEFAULT_EDITOR_PREFERENCES } from "@/features/editor/_internal/domain/preferences";
import { getEditorPreferences } from "@/features/editor/queries";

describe("getEditorPreferences", () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it("gives the defaults when the read fails, so the shell stays up", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    findUnique.mockRejectedValue(new Error("connection lost"));

    await expect(getEditorPreferences("user-1")).resolves.toEqual(
      DEFAULT_EDITOR_PREFERENCES,
    );
  });
});
