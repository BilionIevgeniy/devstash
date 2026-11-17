import { render, screen } from "../../../../../../test/intl";
import { describe, expect, it } from "vitest";

import { ItemTagBadges } from "@/features/items/_internal/components/cards/ItemTagBadges";

// ADR 0027: an AI tag carries the attribute; its icon is named only where
// it is not inside the card's button.
describe("ItemTagBadges and the AI mark", () => {
  it("marks only the AI tags, and names them where spoken", () => {
    render(
      <ItemTagBadges tags={["mine", "react"]} aiTags={["react"]} spoken />,
    );

    const [mine, react] = screen.getAllByRole("listitem");
    expect(mine).not.toHaveAttribute("data-ai-generated");
    expect(mine).toHaveTextContent(/^mine$/);
    expect(react).toHaveAttribute("data-ai-generated", "true");
    expect(react).toHaveTextContent("AI-generatedreact");
  });

  it("keeps the icon silent on a card", () => {
    render(<ItemTagBadges tags={["react"]} aiTags={["react"]} />);

    const react = screen.getByRole("listitem");
    expect(react).toHaveAttribute("data-ai-generated", "true");
    expect(react).toHaveTextContent(/^react$/);
  });
});
