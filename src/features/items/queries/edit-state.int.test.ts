import { beforeAll, describe, expect, it } from "vitest";
import {
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { getItemEditState } from "@/features/items/queries/edit-state";

// Read-only: one seed for the file.
let t: Tenants;

beforeAll(async () => {
  t = await seedTenants();
});

describe("getItemEditState", () => {
  it("returns the owner's item and nothing for anyone else", async () => {
    await expect(
      getItemEditState(t.b.userId, t.b.items.snippet),
    ).resolves.toEqual({
      typeName: "snippet",
      collectionIds: [t.b.collections.main],
      text: {
        title: "useDebounce",
        description: null,
        content: "export function useDebounce() {}",
        language: "typescript",
        url: null,
        tags: expect.arrayContaining(["react", "shared"]),
      },
      ai: {
        description: null,
        content: "export function useDebounce() {}",
        descriptionAiGenerated: false,
        contentAiGenerated: false,
        aiTags: [],
      },
    });
    await expect(
      getItemEditState(t.a.userId, t.b.items.snippet),
    ).resolves.toBeNull();
  });
});
