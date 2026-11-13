import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useImperativeHandle, type RefObject } from "react";
import { describe, expect, it, vi } from "vitest";

import type { EditorHandle } from "@/features/editor/types";
import type {
  ItemFormValues,
  ItemTextField,
} from "@/features/items/domain/item-changes";
import type { DashboardItem, ItemDetailJson } from "@/features/items/types";

const { updateItem, toastError, toastSuccess, contentFocus } = vi.hoisted(
  () => ({
    updateItem: vi.fn(),
    toastError: vi.fn(),
    toastSuccess: vi.fn(),
    contentFocus: vi.fn(),
  }),
);
vi.mock("@/features/items/actions/item", () => ({ updateItem }));
vi.mock("sonner", () => ({
  toast: { error: toastError, success: toastSuccess },
}));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/features/items/_internal/components/CollectionSelect", () => ({
  CollectionSelect: () => null,
}));
vi.mock("@/features/items/_internal/components/DiscardChangesDialog", () => ({
  DiscardChangesDialog: () => null,
}));

// The fields have their own tests; this probe is a title and a content input
// that hand the form the content editor's handle, as ItemFields does.
vi.mock("@/features/items/_internal/components/ItemFields", () => ({
  ItemFields: function ItemFieldsProbe({
    values,
    onChange,
    contentRef,
  }: {
    values: ItemFormValues;
    onChange: (name: ItemTextField, value: string) => void;
    contentRef: RefObject<EditorHandle | null>;
  }) {
    useImperativeHandle(contentRef, () => ({ focus: contentFocus }));
    return (
      <>
        <input
          aria-label="Title"
          value={values.title}
          onChange={(event) => onChange("title", event.target.value)}
        />
        <textarea
          aria-label="Content"
          value={values.content}
          onChange={(event) => onChange("content", event.target.value)}
        />
      </>
    );
  },
}));

import { ItemEditForm } from "@/features/items/_internal/components/ItemEditForm";
import { CONTENT_MAX } from "@/features/items/domain/item-fields";

const TYPE = { id: "type-1", name: "snippet", icon: "Code", color: "#3b82f6" };

const ITEM: DashboardItem = {
  id: "item-1",
  title: "Debounce",
  description: null,
  isFavorite: false,
  isPinned: false,
  createdAt: new Date("2026-11-01T10:00:00Z"),
  tags: [],
  type: TYPE,
};

const DETAIL: ItemDetailJson = {
  ...ITEM,
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-02T10:00:00.000Z",
  contentType: "TEXT",
  content: "const a = 1;",
  url: null,
  language: "typescript",
  collections: [],
  file: null,
};

function renderForm() {
  const onSaved = vi.fn();
  render(
    <ItemEditForm
      item={ITEM}
      detail={DETAIL}
      canUseAi={false}
      onCancel={() => undefined}
      onSaved={onSaved}
    />,
  );
  return { onSaved };
}

describe("ItemEditForm submit", () => {
  it("refuses content over the limit: no save, the reason, the focus in the editor", async () => {
    const user = userEvent.setup();
    renderForm();
    fireEvent.change(screen.getByLabelText("Content"), {
      target: { value: "x".repeat(CONTENT_MAX + 1) },
    });

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(updateItem).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledExactlyOnceWith(
      "Content can be up to 100000 characters",
    );
    expect(contentFocus).toHaveBeenCalledOnce();
  });

  it("saves an ordinary change without a refusal", async () => {
    updateItem.mockResolvedValue({ success: true, data: DETAIL, error: null });
    const user = userEvent.setup();
    const { onSaved } = renderForm();
    await user.type(screen.getByLabelText("Title"), " v2");

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(DETAIL));
    expect(updateItem).toHaveBeenCalledWith(
      "item-1",
      expect.objectContaining({ title: "Debounce v2" }),
    );
    expect(toastError).not.toHaveBeenCalled();
    expect(contentFocus).not.toHaveBeenCalled();
  });

  it("keeps Save disabled while nothing has changed, so there is nothing to refuse", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});
