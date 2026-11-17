import { render, screen } from "../../../../../../test/intl";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

// The AI component has its own tests; this probe accepts a fixed answer,
// so what the fields do with it can be read.
vi.mock("@/features/ai/components/AiTagSuggestions", () => ({
  AiTagSuggestions: ({
    onAccept,
    children,
  }: {
    onAccept: (tag: string) => boolean;
    children: (action: ReactNode) => ReactNode;
  }) =>
    children(
      <button type="button" onClick={() => onAccept(" react ")}>
        Accept tag
      </button>,
    ),
}));

import { TagsField } from "@/features/items/_internal/components/fields/TagsField";

// ADR 0027: the form claims a value only while it is exactly what the field
// was given, so the fields report that value, not the raw answer.
describe("TagsField and an accepted suggestion", () => {
  it("reports an accepted tag, trimmed", async () => {
    const onAcceptTag = vi.fn();
    render(
      <TagsField
        value="mine"
        onChange={vi.fn()}
        canUseAi
        title="t"
        content="c"
        onAcceptTag={onAcceptTag}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Accept tag" }));

    expect(onAcceptTag).toHaveBeenCalledExactlyOnceWith("react");
  });

  it("reports no tag the full field refused", async () => {
    const onAcceptTag = vi.fn();
    const full = Array.from({ length: 20 }, (_, i) => `tag-${i}`).join(", ");
    render(
      <TagsField
        value={full}
        onChange={vi.fn()}
        canUseAi
        title="t"
        content="c"
        onAcceptTag={onAcceptTag}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Accept tag" }));

    expect(onAcceptTag).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledOnce();
  });
});
