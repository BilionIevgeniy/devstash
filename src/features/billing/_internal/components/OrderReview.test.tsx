import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../../../../../test/intl";
import { OrderReview } from "./OrderReview";

const { startCheckout } = vi.hoisted(() => ({ startCheckout: vi.fn() }));
vi.mock("@/features/billing/actions/checkout", () => ({
  startCheckout,
  openBillingPortal: vi.fn(),
  confirmCheckout: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

function renderOrder(plan: "monthly" | "yearly" | null = "monthly") {
  const onClose = vi.fn();
  render(<OrderReview plan={plan} onClose={onClose} testMode={false} />);
  return { onClose };
}

describe("OrderReview", () => {
  it("orders only once the terms and the immediate start are both ticked", async () => {
    const user = userEvent.setup();
    startCheckout.mockResolvedValue({ success: true, data: null, error: null });
    renderOrder();
    const order = screen.getByRole("button", { name: "Order and pay" });

    expect(order).toBeDisabled();
    await user.click(
      screen.getByRole("checkbox", { name: /terms and conditions/ }),
    );
    expect(order).toBeDisabled();
    await user.click(
      screen.getByRole("checkbox", { name: /start right away/ }),
    );
    await user.click(order);

    expect(startCheckout).toHaveBeenCalledWith({
      plan: "monthly",
      acceptTerms: true,
      waiveWithdrawal: true,
    });
  });

  it("states the gross price, the period and the renewal", () => {
    renderOrder("yearly");

    expect(screen.getByText("€72 per year")).toBeInTheDocument();
    expect(screen.getByText(/including VAT/)).toBeInTheDocument();
    expect(
      screen.getByText(/Renews every year until you cancel/),
    ).toBeInTheDocument();
  });

  it("says the order is payable in German", () => {
    render(<OrderReview plan="monthly" onClose={vi.fn()} testMode={false} />, {
      locale: "de",
    });

    expect(
      screen.getByRole("button", { name: "Zahlungspflichtig bestellen" }),
    ).toBeInTheDocument();
    expect(screen.getByText("8 € pro Monat")).toBeInTheDocument();
  });

  it("links the terms and the withdrawal information", () => {
    renderOrder();

    expect(
      screen.getByRole("link", { name: "terms and conditions" }),
    ).toHaveAttribute("href", "/agb");
    expect(
      screen.getByRole("link", { name: "withdrawal information" }),
    ).toHaveAttribute("href", "/agb#agb-en-right");
  });

  it("clears both consents when the dialog closes", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <OrderReview plan="monthly" onClose={onClose} testMode={false} />,
    );
    await user.click(
      screen.getByRole("checkbox", { name: /terms and conditions/ }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: /start right away/ }),
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
    rerender(<OrderReview plan={null} onClose={onClose} testMode={false} />);
    rerender(<OrderReview plan="yearly" onClose={onClose} testMode={false} />);

    expect(
      screen.getByRole("checkbox", { name: /terms and conditions/ }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /start right away/ }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "Order and pay" }),
    ).toBeDisabled();
  });

  it("stays closed with no plan", () => {
    renderOrder(null);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
