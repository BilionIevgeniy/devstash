import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Field } from "@/components/common/Field";

describe("Field", () => {
  it("points its label at the control, so a click on it focuses a plain input", async () => {
    const user = userEvent.setup();
    render(<Field label="Title">{(id) => <input id={id} />}</Field>);

    await user.click(screen.getByText("Title"));

    expect(screen.getByLabelText("Title")).toHaveFocus();
  });

  it("calls onLabelClick when the label is clicked", async () => {
    const onLabelClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Field label="Content" onLabelClick={onLabelClick}>
        {() => <div>An editor the label cannot reach</div>}
      </Field>,
    );

    await user.click(screen.getByText("Content"));

    expect(onLabelClick).toHaveBeenCalledOnce();
  });

  it("calls it for a label that sits beside an action too", async () => {
    const onLabelClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Field
        label="Content"
        onLabelClick={onLabelClick}
        action={<button type="button">Generate</button>}
      >
        {() => <div />}
      </Field>,
    );

    await user.click(screen.getByText("Content"));
    expect(onLabelClick).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Generate" }));
    expect(onLabelClick).toHaveBeenCalledOnce();
  });
});
