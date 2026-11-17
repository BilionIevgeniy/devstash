import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "../../../../../../test/intl";
import userEvent from "@testing-library/user-event";
import { useImperativeHandle, type RefObject } from "react";
import { describe, expect, it, vi } from "vitest";

import type { EditorHandle } from "@/features/editor/types";
import type {
  ItemFormValues,
  ItemTextField,
} from "@/features/items/domain/item-changes";
import type { AcceptedAiHandlers } from "@/features/items/_internal/components/hooks/use-accepted-ai";
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
vi.mock(
  "@/features/items/_internal/components/fields/CollectionSelect",
  () => ({
    CollectionSelect: () => null,
  }),
);
vi.mock(
  "@/features/items/_internal/components/form/DiscardChangesDialog",
  () => ({
    DiscardChangesDialog: () => null,
  }),
);

// The fields have their own tests; this probe is a title and a content input
// that hand the form the content editor's handle, as ItemFields does.
vi.mock("@/features/items/_internal/components/fields/ItemFields", () => ({
  ItemFields: function ItemFieldsProbe({
    values,
    onChange,
    contentRef,
    acceptedAi,
  }: {
    values: ItemFormValues;
    onChange: (name: ItemTextField, value: string) => void;
    contentRef: RefObject<EditorHandle | null>;
    acceptedAi: AcceptedAiHandlers;
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
          aria-label="Description"
          value={values.description}
          onChange={(event) => onChange("description", event.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            onChange("description", "A summary.");
            acceptedAi.acceptDescription("A summary.");
          }}
        >
          Accept summary
        </button>
        <button
          type="button"
          onClick={() => {
            onChange("tags", "mine, react");
            acceptedAi.acceptTag("react");
          }}
        >
          Accept tag
        </button>
        <textarea
          aria-label="Content"
          value={values.content}
          onChange={(event) => onChange("content", event.target.value)}
        />
      </>
    );
  },
}));

import { ItemEditForm } from "@/features/items/_internal/components/form/ItemEditForm";
import { CONTENT_MAX } from "@/features/items/domain/item-fields";

const TYPE = { id: "type-1", name: "snippet", icon: "Code", color: "#3b82f6" };

const ITEM: DashboardItem = {
  id: "item-1",
  title: "Debounce",
  description: null,
  isFavorite: false,
  isPinned: false,
  descriptionAiGenerated: false,
  aiTags: [],
  createdAt: new Date("2026-11-01T10:00:00Z"),
  tags: [],
  type: TYPE,
};

const DETAIL: ItemDetailJson = {
  ...ITEM,
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-02T10:00:00.000Z",
  contentType: "TEXT",
  contentAiGenerated: false,
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

// The marks of ADR 0027: the form claims only what still holds the AI's text.
describe("ItemEditForm AI claims", () => {
  async function saveAfter(
    steps: (user: ReturnType<typeof userEvent.setup>) => Promise<void>,
  ) {
    updateItem.mockResolvedValue({ success: true, data: DETAIL, error: null });
    const user = userEvent.setup();
    const { onSaved } = renderForm();
    await steps(user);
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    return updateItem.mock.calls[0][1].aiGenerated;
  }

  it("claims an accepted summary that was left as it is", async () => {
    const claims = await saveAfter((user) =>
      user.click(screen.getByRole("button", { name: "Accept summary" })),
    );
    expect(claims).toEqual({ description: true, content: false, tags: [] });
  });

  it("does not claim a summary edited after it was accepted", async () => {
    const claims = await saveAfter(async (user) => {
      await user.click(screen.getByRole("button", { name: "Accept summary" }));
      await user.type(screen.getByLabelText("Description"), " Mine.");
    });
    expect(claims.description).toBe(false);
  });

  it("claims the accepted tags, not the ones typed", async () => {
    const claims = await saveAfter((user) =>
      user.click(screen.getByRole("button", { name: "Accept tag" })),
    );
    expect(claims.tags).toEqual(["react"]);
  });

  it("claims nothing for an ordinary edit", async () => {
    const claims = await saveAfter((user) =>
      user.type(screen.getByLabelText("Title"), " v2"),
    );
    expect(claims).toEqual({ description: false, content: false, tags: [] });
  });
});
