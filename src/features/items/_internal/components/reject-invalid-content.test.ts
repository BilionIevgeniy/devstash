import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EditorHandle } from "@/features/editor/types";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import { rejectInvalidContent } from "@/features/items/_internal/components/reject-invalid-content";
import {
  CONTENT_MAX,
  CONTENT_TOO_LONG_MESSAGE,
  editableFields,
} from "@/features/items/domain/item-fields";

const TOO_LONG = "x".repeat(CONTENT_MAX + 1);

function editorWithFocus() {
  const focus = vi.fn();
  return { focus, ref: { current: { focus } satisfies EditorHandle } };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("rejectInvalidContent", () => {
  it("lets content within the limit through and touches nothing", () => {
    const { focus, ref } = editorWithFocus();

    const rejected = rejectInvalidContent(
      editableFields("snippet"),
      "const a = 1;",
      ref,
    );

    expect(rejected).toBe(false);
    expect(toastError).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
  });

  it("stops content over the limit, says why and focuses the editor", () => {
    const { focus, ref } = editorWithFocus();

    const rejected = rejectInvalidContent(
      editableFields("snippet"),
      TOO_LONG,
      ref,
    );

    expect(rejected).toBe(true);
    expect(toastError).toHaveBeenCalledExactlyOnceWith(
      CONTENT_TOO_LONG_MESSAGE,
    );
    expect(focus).toHaveBeenCalledOnce();
  });

  it("still stops and toasts when the editor has not loaded yet", () => {
    const rejected = rejectInvalidContent(editableFields("note"), TOO_LONG, {
      current: null,
    });

    expect(rejected).toBe(true);
    expect(toastError).toHaveBeenCalledOnce();
  });

  it("does not judge a type that has no content", () => {
    const { focus, ref } = editorWithFocus();

    const rejected = rejectInvalidContent(
      editableFields("link"),
      TOO_LONG,
      ref,
    );

    expect(rejected).toBe(false);
    expect(focus).not.toHaveBeenCalled();
  });
});
