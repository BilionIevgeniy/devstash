import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../../../../../test/intl";
import { CheckoutButtons } from "./CheckoutButtons";

vi.mock("@/features/billing/actions/checkout", () => ({
  startCheckout: vi.fn(),
  openBillingPortal: vi.fn(),
  confirmCheckout: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

function Route({ mode }: { mode: "visible" | "hidden" }) {
  return (
    <Activity mode={mode}>
      <CheckoutButtons testMode={false} />
    </Activity>
  );
}

describe("CheckoutButtons", () => {
  it("brings no order step and no ticked consent back when the route shows again", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Route mode="visible" />);
    await user.click(screen.getAllByRole("button")[0]);
    await user.click(
      screen.getByRole("checkbox", { name: /terms and conditions/ }),
    );

    rerender(<Route mode="hidden" />);
    rerender(<Route mode="visible" />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getAllByRole("button")[0]);
    expect(
      screen.getByRole("checkbox", { name: /terms and conditions/ }),
    ).not.toBeChecked();
  });
});
