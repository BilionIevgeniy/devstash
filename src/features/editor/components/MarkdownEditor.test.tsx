import { act, render, screen } from "../../../../test/intl";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import type { EditorHandle } from "@/features/editor/types";

// The preview loads the Markdown parser on its own; a stand-in is enough here.
vi.mock("next/dynamic", () => ({
  default: () =>
    function PreviewStandIn() {
      return <p>Rendered preview</p>;
    },
}));

import { MarkdownEditor } from "@/features/editor/components/MarkdownEditor";

function renderEditor(readOnly = false) {
  const ref = createRef<EditorHandle>();
  render(
    <MarkdownEditor
      ref={ref}
      value="# Notes"
      readOnly={readOnly}
      onChange={() => undefined}
    />,
  );
  return ref;
}

describe("MarkdownEditor handle", () => {
  it("focuses the textarea", () => {
    const ref = renderEditor();

    act(() => ref.current?.focus());

    expect(screen.getByRole("textbox", { name: "Content" })).toHaveFocus();
  });

  // jsdom loads no CSS, so the hidden Write textarea is focusable here too:
  // only the tab assertion tells this test anything about the switch. The
  // order of the switch and the focus is pinned by the end-to-end spec "a note
  // over the content limit is refused with the editor focused".
  it("switches back from Preview to Write before it focuses", async () => {
    const user = userEvent.setup();
    const ref = renderEditor();
    await user.click(screen.getByRole("tab", { name: "Preview" }));
    expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    act(() => ref.current?.focus());

    expect(screen.getByRole("tab", { name: "Write" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("textbox", { name: "Content" })).toHaveFocus();
  });

  it("does nothing in the read-only view", () => {
    const ref = renderEditor(true);

    expect(() => act(() => ref.current?.focus())).not.toThrow();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(document.body).toHaveFocus();
  });
});
