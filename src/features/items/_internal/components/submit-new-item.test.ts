import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ItemFormValues } from "@/features/items/domain/item-changes";

const { createItem, toastError } = vi.hoisted(() => ({
  createItem: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("@/features/items/actions/item", () => ({ createItem }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import {
  submitNewItem,
  type NewItemSubmission,
} from "@/features/items/_internal/components/submit-new-item";
import {
  CONTENT_MAX,
  editableFields,
} from "@/features/items/domain/item-fields";
import { createErrorText } from "../../../../../test/error-text";

const VALUES: ItemFormValues = {
  title: "Debounce",
  description: "A helper",
  content: "const a = 1;",
  language: "typescript",
  url: "https://example.com",
  tags: "react, hooks",
  collectionIds: ["col-1"],
};

const focus = vi.fn();
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
    upload: null,
    contentRef: { current: { focus } },
    run,
    errorText: createErrorText(),
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
  createItem.mockResolvedValue({ success: true, data: null, error: null });
});

describe("submitNewItem", () => {
  it("stops content over the limit before any request, with a toast and the focus", () => {
    submitNewItem(
      submission({
        values: { ...VALUES, content: "x".repeat(CONTENT_MAX + 1) },
      }),
    );

    expect(createItem).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledOnce();
    expect(focus).toHaveBeenCalledOnce();
  });

  it("sends the fields of a snippet and leaves the URL out", async () => {
    await submitAndSend();

    expect(createItem).toHaveBeenCalledExactlyOnceWith({
      typeName: "snippet",
      title: "Debounce",
      description: "A helper",
      tags: ["react", "hooks"],
      collectionIds: ["col-1"],
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
