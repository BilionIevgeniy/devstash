import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ItemFormValues } from "@/features/items/domain/item-changes";

const { createItem } = vi.hoisted(() => ({ createItem: vi.fn() }));
vi.mock("@/features/items/actions/item", () => ({ createItem }));

import {
  submitNewItem,
  type NewItemSubmission,
} from "@/features/items/_internal/components/form/submit-new-item";
import { editableFields } from "@/features/items/domain/item-fields";
import { NO_AI_CLAIMS } from "@/features/items/domain/ai-marks";

const VALUES: ItemFormValues = {
  title: "Debounce",
  description: "A helper",
  content: "const a = 1;",
  language: "typescript",
  url: "https://example.com",
  tags: "react, hooks",
  collectionIds: ["col-1"],
};

const rejectInvalid = vi.fn<NewItemSubmission["rejectInvalid"]>();
const run = vi.fn<NewItemSubmission["run"]>();
const onCreated = vi.fn();
const syncItems = vi.fn<NewItemSubmission["syncItems"]>();

function submission(
  overrides: Partial<NewItemSubmission> = {},
): NewItemSubmission {
  return {
    typeName: "snippet",
    fields: editableFields("snippet"),
    values: VALUES,
    aiGenerated: NO_AI_CLAIMS,
    upload: null,
    rejectInvalid,
    run,
    syncItems,
    onCreated,
    ...overrides,
  };
}

// The dialog's run (useSubmitDialog, tested on its own) calls the action;
// here it does so at once, so the payload can be read.
async function submitAndSend(overrides?: Partial<NewItemSubmission>) {
  submitNewItem(submission(overrides));
  const [action] = run.mock.calls[0];
  await action();
}

beforeEach(() => {
  vi.resetAllMocks();
  rejectInvalid.mockReturnValue(false);
  createItem.mockResolvedValue({ success: true, data: null, error: null });
});

describe("submitNewItem", () => {
  it("sends nothing when the check refuses a field", () => {
    rejectInvalid.mockReturnValue(true);
    submitNewItem(submission());

    expect(rejectInvalid).toHaveBeenCalledExactlyOnceWith(VALUES);
    expect(createItem).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("sends the fields of a snippet and leaves the URL out", async () => {
    await submitAndSend();

    expect(createItem).toHaveBeenCalledExactlyOnceWith({
      typeName: "snippet",
      title: "Debounce",
      description: "A helper",
      tags: ["react", "hooks"],
      collectionIds: ["col-1"],
      aiGenerated: NO_AI_CLAIMS,
      content: "const a = 1;",
      language: "typescript",
    });
  });

  it("sends the URL of a link and no content", async () => {
    await submitAndSend({ typeName: "link", fields: editableFields("link") });

    expect(createItem).toHaveBeenCalledExactlyOnceWith({
      typeName: "link",
      title: "Debounce",
      description: "A helper",
      tags: ["react", "hooks"],
      collectionIds: ["col-1"],
      aiGenerated: NO_AI_CLAIMS,
      url: "https://example.com",
    });
  });

  it("sends the upload of an image under its key and name", async () => {
    await submitAndSend({
      typeName: "image",
      fields: editableFields("image"),
      upload: {
        key: "users/u1/pic.png",
        fileName: "pic.png",
      } as NewItemSubmission["upload"],
    });

    expect(createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        typeName: "image",
        file: { key: "users/u1/pic.png", name: "pic.png" },
      }),
    );
  });

  it("closes with the dialog's onCreated, and names its own failure", () => {
    submitNewItem(submission());

    expect(run).toHaveBeenCalledExactlyOnceWith(expect.any(Function), {
      onSuccess: onCreated,
      failCode: "itemCreateFailed",
      sync: expect.any(Function),
    });
  });

  it("makes the cache follow a new item before the dialog closes", async () => {
    syncItems.mockResolvedValue();
    submitNewItem(submission());
    const [, { sync }] = run.mock.calls[0];
    await sync?.();

    expect(syncItems).toHaveBeenCalledExactlyOnceWith({ kind: "created" });
  });
});
