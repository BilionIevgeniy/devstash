import { Activity, useState } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { render, screen } from "../../../../test/intl";
import { useRemountOnReveal } from "@/components/common/hooks/use-remount-on-reveal";

function Field() {
  const [value, setValue] = useState("");
  return (
    <input
      aria-label="Secret"
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

function Fresh() {
  return <Field key={useRemountOnReveal()} />;
}

function Route({ mode }: { mode: "visible" | "hidden" }) {
  return (
    <Activity mode={mode}>
      <Fresh />
    </Activity>
  );
}

describe("useRemountOnReveal", () => {
  it("keeps the state while shown, and starts fresh once the route shows again", async () => {
    const { rerender } = render(<Route mode="visible" />);
    const input = () => screen.getByRole("textbox", { name: "Secret" });
    await userEvent.setup().type(input(), "typed");
    rerender(<Route mode="visible" />);
    expect(input()).toHaveValue("typed");

    rerender(<Route mode="hidden" />);
    rerender(<Route mode="visible" />);

    expect(input()).toHaveValue("");
  });
});
