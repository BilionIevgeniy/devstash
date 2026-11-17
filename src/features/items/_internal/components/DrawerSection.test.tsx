import { render, screen } from "../../../../../test/intl";
import { describe, expect, it } from "vitest";

import { DrawerSection } from "@/features/items/_internal/components/DrawerSection";

// ADR 0027: a marked value carries the attribute and a visible label; an
// unmarked one carries neither.
describe("DrawerSection and the AI mark", () => {
  it("labels a marked section and puts the attribute on its value", () => {
    render(
      <DrawerSection title="Description" aiGenerated>
        <p>A summary.</p>
      </DrawerSection>,
    );

    expect(
      screen.getByRole("heading", { name: "Description AI-generated" }),
    ).toBeInTheDocument();
    expect(screen.getByText("A summary.").parentElement).toHaveAttribute(
      "data-ai-generated",
      "true",
    );
  });

  it("leaves an unmarked section as it was", () => {
    render(
      <DrawerSection title="Description">
        <p>Mine.</p>
      </DrawerSection>,
    );

    expect(screen.queryByText("AI-generated")).not.toBeInTheDocument();
    expect(screen.getByText("Mine.").parentElement).not.toHaveAttribute(
      "data-ai-generated",
    );
  });
});
