import { beforeEach, describe, expect, it } from "vitest";
import { seedTenants, type Tenants } from "../../../test/integration/fixtures";
import { snapshotTenant } from "../../../test/integration/snapshot";
import { saveEditorPreferences } from "@/features/editor/_internal/services/preferences";
import { getEditorPreferences } from "@/features/editor/queries";

// The read and the write of `editor` in one file: both are one statement keyed
// by the caller's userId.
let t: Tenants;

beforeEach(async () => {
  t = await seedTenants();
});

describe("editor preferences", () => {
  it("A's save changes A's row only", async () => {
    const before = await snapshotTenant(t.b.userId);
    await saveEditorPreferences(t.a.userId, {
      fontSize: 18,
      tabSize: 4,
      wordWrap: false,
      minimap: true,
      theme: "monokai",
    });

    await expect(getEditorPreferences(t.a.userId)).resolves.toMatchObject({
      fontSize: 18,
      theme: "monokai",
    });
    await expect(getEditorPreferences(t.b.userId)).resolves.toMatchObject({
      fontSize: 14,
      theme: "vs-dark",
    });
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });
});
