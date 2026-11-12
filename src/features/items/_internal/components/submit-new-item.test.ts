import type { TransitionStartFunction } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ItemFormValues } from "@/features/items/domain/item-changes";

const { createItem, toastError, rethrow } = vi.hoisted(() => ({
  createItem: vi.fn(),
  toastError: vi.fn(),
  rethrow: vi.fn(),
}));
vi.mock("@/features/items/actions/item", () => ({ createItem }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));
vi.mock("next/navigation", () => ({ unstable_rethrow: rethrow }));

import {
  submitNewItem,
  type NewItemSubmission,
} from "@/features/items/_internal/components/submit-new-item";
import {
  CONTENT_MAX,
  editableFields,
} from "@/features/items/domain/item-fields";

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
const startCreating = vi.fn<TransitionStartFunction>();
const onCreated = vi.fn();

function submission(
  overrides: Partial<NewItemSubmission> = {},
): NewItemSubmission {
  return {
    typeName: "snippet",
    fields: editableFields("snippet"),
    values: VALUES,
    upload: null,
    contentRef: { current: { focus } },
    startCreating,
    onCreated,
    ...overrides,
  };
}

async function submitAndSettle(overrides?: Partial<NewItemSubmission>) {
  submitNewItem(submission(overrides));
  await vi.waitFor(() =>
    expect(createItem.mock.calls.length).toBeGreaterThan(0),
  );
  await Promise.resolve();
}

beforeEach(() => {
  vi.resetAllMocks();
  // A transition that runs its callback at once; the async body is what the
  // action's answer then drives.
  startCreating.mockImplementation((callback) => {
    void callback();
  });
});

describe("submitNewItem", () => {
  it("stops content over the limit before any request, with a toast and the focus", () => {
    submitNewItem(
      submission({
        values: { ...VALUES, content: "x".repeat(CONTENT_MAX + 1) },
      }),
    );

    expect(createItem).not.toHaveBeenCalled();
    expect(startCreating).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledOnce();
    expect(focus).toHaveBeenCalledOnce();
  });

  it("sends the fields of a snippet and leaves the URL out", async () => {
    createItem.mockResolvedValue({ success: true, data: null, error: null });

    await submitAndSettle();

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
    createItem.mockResolvedValue({ success: true, data: null, error: null });

    await submitAndSettle({ typeName: "link", fields: editableFields("link") });

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
    createItem.mockResolvedValue({ success: true, data: null, error: null });

    await submitAndSettle({
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

  it("closes through a second transition once the item is created", async () => {
    createItem.mockResolvedValue({ success: true, data: null, error: null });

    await submitAndSettle();

    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    expect(startCreating).toHaveBeenCalledTimes(2);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("toasts the server's reason and keeps the dialog open", async () => {
    createItem.mockResolvedValue({
      success: false,
      data: null,
      error: "You reached the limit of 50 items",
    });

    await submitAndSettle();

    await vi.waitFor(() =>
      expect(toastError).toHaveBeenCalledExactlyOnceWith(
        "You reached the limit of 50 items",
      ),
    );
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("toasts a generic failure when the action rejects, after Next had a look", async () => {
    const failure = new Error("network");
    createItem.mockRejectedValue(failure);

    await submitAndSettle();

    await vi.waitFor(() =>
      expect(toastError).toHaveBeenCalledExactlyOnceWith(
        "Couldn't create the item",
      ),
    );
    expect(rethrow).toHaveBeenCalledWith(failure);
    expect(onCreated).not.toHaveBeenCalled();
  });
});
