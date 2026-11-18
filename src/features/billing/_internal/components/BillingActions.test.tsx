import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../../../../../test/intl";
import { BillingActions } from "./BillingActions";

vi.mock("@/features/billing/actions/checkout", () => ({
  startCheckout: vi.fn(),
  openBillingPortal: vi.fn(),
  confirmCheckout: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

function renderActions(hasBillingAccount: boolean) {
  render(
    <BillingActions
      isPro
      hasBillingAccount={hasBillingAccount}
      paymentIssue={false}
      testMode={false}
    />,
  );
}

describe("BillingActions", () => {
  it("tells a Pro grant with no Stripe customer that there is nothing to manage", () => {
    renderActions(false);

    expect(
      screen.getByText(/no subscription to manage or cancel/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Manage Billing" }),
    ).not.toBeInTheDocument();
  });

  it("offers Manage Billing to a subscriber", () => {
    renderActions(true);

    expect(
      screen.getByRole("button", { name: "Manage Billing" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/no subscription to manage or cancel/),
    ).not.toBeInTheDocument();
  });
});
