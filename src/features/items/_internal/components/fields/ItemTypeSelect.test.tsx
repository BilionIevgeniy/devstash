import { render, screen } from "../../../../../../test/intl";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ItemTypeSelect } from "@/features/items/_internal/components/fields/ItemTypeSelect";

describe("ItemTypeSelect", () => {
  it("offers the user's custom types after the system types, by their own names", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ItemTypeSelect
        value="snippet"
        onChange={onChange}
        customTypeNames={["Recipes"]}
        isPro
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Type" }));
    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options.at(-1)).toBe("Recipes");
    await user.click(screen.getByRole("option", { name: "Recipes" }));
    expect(onChange).toHaveBeenCalledWith("Recipes");
  });

  it("keeps a former Pro user's custom types, disabled with the Pro badge", async () => {
    const user = userEvent.setup();
    render(
      <ItemTypeSelect
        value="snippet"
        onChange={vi.fn()}
        customTypeNames={["Recipes"]}
        isPro={false}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Type" }));
    expect(screen.getByRole("option", { name: /Recipes/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
