import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SortSelect } from "@/app/(app)/_components/SortSelect";

const SORTS = ["newest", "oldest", "a-z"] as const;

function renderSelect(value: (typeof SORTS)[number] = "newest") {
  const onChange = vi.fn();
  const props = { sorts: SORTS, onChange, ariaLabel: "Sort favorites" };
  const view = render(<SortSelect {...props} value={value} />);
  return {
    onChange,
    user: userEvent.setup(),
    showValue: (next: (typeof SORTS)[number]) =>
      view.rerender(<SortSelect {...props} value={next} />),
  };
}

describe("SortSelect", () => {
  it("shows the label of the current sort and follows the value", () => {
    const { showValue } = renderSelect("newest");
    const select = screen.getByRole("combobox", { name: "Sort favorites" });
    expect(select).toHaveTextContent("Newest");

    showValue("a-z");

    expect(select).toHaveTextContent("A-Z");
  });

  it("calls onChange with the chosen sort", async () => {
    const { onChange, user } = renderSelect("newest");

    await user.click(screen.getByRole("combobox", { name: "Sort favorites" }));
    await user.click(await screen.findByRole("option", { name: "A-Z" }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith("a-z");
  });

  it("offers only the sorts it is given", async () => {
    const { user } = renderSelect();

    await user.click(screen.getByRole("combobox", { name: "Sort favorites" }));

    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Newest",
      "Oldest",
      "A-Z",
    ]);
  });
});
