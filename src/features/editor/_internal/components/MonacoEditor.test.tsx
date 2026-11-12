import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_EDITOR_PREFERENCES } from "@/features/editor/_internal/domain/preferences";
import type { EditorHandle } from "@/features/editor/types";

type MountHandler = (editor: typeof fakeEditor) => void;

const { fakeEditor, monaco, loadState } = vi.hoisted(() => ({
  fakeEditor: {
    focus: vi.fn(),
    getContentHeight: () => 120,
    onDidContentSizeChange: vi.fn(),
  },
  monaco: { onMount: null as MountHandler | null },
  loadState: { hasFailed: false },
}));

// Monaco itself needs a browser with workers. The stand-in keeps the callback
// the component hands over, so a test decides when the editor has mounted.
vi.mock("@monaco-editor/react", () => ({
  default: ({ onMount }: { onMount: MountHandler }) => {
    monaco.onMount = onMount;
    return <div data-testid="monaco" />;
  },
  loader: { config: () => undefined },
}));
vi.mock(
  "@/features/editor/_internal/components/hooks/use-monaco-load-failed",
  () => ({ useMonacoLoadFailed: () => loadState.hasFailed }),
);
vi.mock("@/features/editor/components/EditorPreferencesProvider", () => ({
  useEditorPreferences: () => ({ preferences: DEFAULT_EDITOR_PREFERENCES }),
}));

import { MonacoEditor } from "@/features/editor/_internal/components/MonacoEditor";

function renderEditor() {
  const ref = createRef<EditorHandle>();
  render(
    <MonacoEditor
      ref={ref}
      value="const a = 1;"
      language="typescript"
      height={160}
      readOnly={false}
      ariaLabel="Content"
      onContentHeight={() => undefined}
    />,
  );
  return ref;
}

beforeEach(() => {
  monaco.onMount = null;
  loadState.hasFailed = false;
});

describe("MonacoEditor handle", () => {
  it("does nothing until Monaco has mounted, then focuses its editor", () => {
    const ref = renderEditor();

    act(() => ref.current?.focus());
    expect(fakeEditor.focus).not.toHaveBeenCalled();

    act(() => monaco.onMount?.(fakeEditor));
    act(() => ref.current?.focus());

    expect(fakeEditor.focus).toHaveBeenCalledOnce();
  });

  it("focuses the plain textarea when Monaco could not load", () => {
    loadState.hasFailed = true;
    const ref = renderEditor();

    act(() => ref.current?.focus());

    expect(screen.getByRole("textbox", { name: "Content" })).toHaveFocus();
    expect(fakeEditor.focus).not.toHaveBeenCalled();
  });
});
