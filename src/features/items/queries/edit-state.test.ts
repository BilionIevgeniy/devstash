import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst } = vi.hoisted(() => ({
  findFirst: vi.fn(),
}));
vi.mock("@/lib/postgres/prisma", () => ({ prisma: { item: { findFirst } } }));

import { getItemEditState } from "@/features/items/queries/edit-state";

describe("getItemEditState", () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  it("only looks up items that belong to the caller", async () => {
    findFirst.mockResolvedValue(null);

    await expect(getItemEditState("user-1", "item-1")).resolves.toBeNull();

    expect(findFirst.mock.calls[0][0].where).toEqual({
      id: "item-1",
      userId: "user-1",
    });
  });

  it("flattens the type and the collection links", async () => {
    findFirst.mockResolvedValue({
      title: "Debounce",
      description: "A summary",
      content: "code",
      language: "ts",
      url: null,
      descriptionAiGenerated: true,
      contentAiGenerated: false,
      type: { name: "snippet" },
      collections: [{ collectionId: "col-1" }, { collectionId: "col-2" }],
      tags: [
        { aiGenerated: true, tag: { name: "hooks" } },
        { aiGenerated: false, tag: { name: "mine" } },
      ],
    });

    await expect(getItemEditState("user-1", "item-1")).resolves.toEqual({
      typeName: "snippet",
      collectionIds: ["col-1", "col-2"],
      text: {
        title: "Debounce",
        description: "A summary",
        content: "code",
        language: "ts",
        url: null,
        tags: ["hooks", "mine"],
      },
      ai: {
        description: "A summary",
        content: "code",
        descriptionAiGenerated: true,
        contentAiGenerated: false,
        aiTags: ["hooks"],
      },
    });
  });
});
