import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useImperativeHandle, type Ref } from "react";
import { describe, expect, it, vi } from "vitest";

import type { EditorHandle } from "@/features/editor/types";
import type { ItemFormValues } from "@/features/items/domain/item-changes";

const { codeFocus, markdownFocus } = vi.hoisted(() => ({
  codeFocus: vi.fn(),
  markdownFocus: vi.fn(),
}));

// The editors are heavy and have their own tests; a probe that hands over a
// handle is all this one needs to see.
vi.mock("@/features/editor/components/CodeEditor", () => ({
  CodeEditor: function CodeEditorProbe({ ref }: { ref?: Ref<EditorHandle> }) {
    useImperativeHandle(ref, () => ({ focus: codeFocus }));
    return <div>Code editor</div>;
  },
}));
vi.mock("@/features/editor/components/MarkdownEditor", () => ({
  MarkdownEditor: function MarkdownEditorProbe({
    ref,
  }: {
    ref?: Ref<EditorHandle>;
  }) {
    useImperativeHandle(ref, () => ({ focus: markdownFocus }));
    return <div>Markdown editor</div>;
  },
}));
vi.mock("@/features/editor/components/LanguageSelect", () => ({
  LanguageSelect: () => <div>Language select</div>,
}));
vi.mock("@/features/items/_internal/components/DescriptionField", () => ({
  DescriptionField: () => <div>Description field</div>,
}));
vi.mock("@/features/items/_internal/components/TagsField", () => ({
  TagsField: () => <div>Tags field</div>,
}));

import { ItemFields } from "@/features/items/_internal/components/ItemFields";
import { editableFields } from "@/features/items/domain/item-fields";

const VALUES: ItemFormValues = {
  title: "Debounce",
  description: "",
  content: "const a = 1;",
  language: "typescript",
  url: "",
  tags: "",
  collectionIds: [],
};

function renderFields(typeName: string) {
  const contentRef = createRef<EditorHandle>();
  render(
    <ItemFields
      fields={editableFields(typeName)}
      values={VALUES}
      onChange={() => undefined}
      canUseAi={false}
      contentRef={contentRef}
    />,
  );
  return contentRef;
}

describe("ItemFields content editor", () => {
  it("hands the code editor's handle to the form", () => {
    const contentRef = renderFields("snippet");

    contentRef.current?.focus();

    expect(codeFocus).toHaveBeenCalledOnce();
  });

  it("hands the Markdown editor's handle to the form", () => {
    const contentRef = renderFields("note");

    contentRef.current?.focus();

    expect(markdownFocus).toHaveBeenCalledOnce();
  });

  it("focuses the code editor when its label is clicked", async () => {
    const user = userEvent.setup();
    renderFields("snippet");

    await user.click(screen.getByText("Content"));

    expect(codeFocus).toHaveBeenCalledOnce();
  });

  it("focuses the Markdown editor when its label is clicked", async () => {
    const user = userEvent.setup();
    renderFields("note");

    await user.click(screen.getByText("Content"));

    expect(markdownFocus).toHaveBeenCalledOnce();
  });

  it("has no content editor to focus for a link", () => {
    const contentRef = renderFields("link");

    expect(contentRef.current).toBeNull();
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });
});
