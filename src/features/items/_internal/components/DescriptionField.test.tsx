import { render, screen } from "../../../../../test/intl";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// The AI component has its own tests; this probe accepts a fixed answer,
// so what the fields do with it can be read.
vi.mock("@/features/ai/components/AiDescriptionSummary", () => ({
  AiDescriptionSummary: ({
    onAccept,
    children,
  }: {
    onAccept: (summary: string) => void;
    children: (action: ReactNode) => ReactNode;
  }) =>
    children(
      <button type="button" onClick={() => onAccept("s".repeat(2_100))}>
        Accept summary
      </button>,
    ),
}));

import { DescriptionField } from "@/features/items/_internal/components/DescriptionField";
import { DESCRIPTION_MAX } from "@/features/items/domain/item-fields";

// ADR 0027: the form claims a value only while it is exactly what the field
// was given, so the fields report that value, not the raw answer.
describe("DescriptionField and an accepted summary", () => {
  it("reports the summary as it was put in the field, cut to the limit", async () => {
    const onChange = vi.fn();
    const onAcceptSummary = vi.fn();
    render(
      <DescriptionField
        value=""
        onChange={onChange}
        canUseAi
        title="t"
        content="c"
        onAcceptSummary={onAcceptSummary}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Accept summary" }),
    );

    const value = "s".repeat(DESCRIPTION_MAX);
    expect(onChange).toHaveBeenCalledWith(value);
    expect(onAcceptSummary).toHaveBeenCalledExactlyOnceWith(value);
  });
});
