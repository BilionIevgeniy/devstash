import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../../../../test/intl";
import { CancelContractForm } from "./CancelContractForm";

const { cancelOwnContract, declareCancellation } = vi.hoisted(() => ({
  cancelOwnContract: vi.fn(),
  declareCancellation: vi.fn(),
}));
vi.mock("@/features/billing/actions/cancellation", () => ({
  cancelOwnContract,
  declareCancellation,
}));

const DECLARED = {
  success: true,
  error: null,
  data: { declaredAt: "2026-11-18T09:00:00.000Z" },
};

async function fillSignedOut() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Name / Name"), "Ada Lovelace");
  await user.type(
    screen.getByLabelText(
      "E-Mail-Adresse deines Kontos / Email address of your account",
    ),
    "ada@example.com",
  );
  return user;
}

describe("CancelContractForm signed out", () => {
  it("declares the cancellation and shows its record with the time", async () => {
    declareCancellation.mockResolvedValue(DECLARED);
    render(<CancelContractForm contract={null} />);
    const user = await fillSignedOut();

    await user.click(
      screen.getByRole("button", { name: "Jetzt kündigen / Cancel now" }),
    );

    expect(declareCancellation).toHaveBeenCalledWith({
      name: "Ada Lovelace",
      email: "ada@example.com",
      kind: "ordinary",
      reason: undefined,
    });
    expect(
      await screen.findByRole("heading", {
        name: "Kündigung eingegangen / Cancellation received",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/November 18, 2026 at 10:00:00 AM/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("E-Mail / Email: ada@example.com"),
    ).toBeInTheDocument();
  });

  it("keeps the input and says the refusal in both languages", async () => {
    declareCancellation.mockResolvedValue({
      success: false,
      data: null,
      error: "tooManyAttempts",
      params: { minutes: 5 },
    });
    render(<CancelContractForm contract={null} />);
    const user = await fillSignedOut();

    await user.click(
      screen.getByRole("button", { name: "Jetzt kündigen / Cancel now" }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("5 Minuten");
    expect(alert).toHaveTextContent("5 minutes");
    expect(screen.getByLabelText("Name / Name")).toHaveValue("Ada Lovelace");
  });

  it("sends the reason of a cancellation for good cause", async () => {
    declareCancellation.mockResolvedValue(DECLARED);
    render(<CancelContractForm contract={null} />);
    const user = await fillSignedOut();

    await user.click(screen.getByRole("radio", { name: /For good cause/ }));
    await user.type(screen.getByLabelText(/Reason, for good cause/), "Moving");
    await user.click(
      screen.getByRole("button", { name: "Jetzt kündigen / Cancel now" }),
    );

    expect(declareCancellation.mock.calls[0][0]).toMatchObject({
      kind: "extraordinary",
      reason: "Moving",
    });
  });
});

describe("CancelContractForm signed in", () => {
  it("cancels the running contract without asking who", async () => {
    cancelOwnContract.mockResolvedValue(DECLARED);
    const user = userEvent.setup();
    render(
      <CancelContractForm
        contract={{ status: "live", periodEnd: "2026-12-18T00:00:00.000Z" }}
      />,
    );

    expect(screen.queryByLabelText("Name / Name")).not.toBeInTheDocument();
    expect(
      screen.getByText(/next renewal on December 18, 2026/),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Jetzt kündigen / Cancel now" }),
    );

    expect(cancelOwnContract).toHaveBeenCalledWith({
      kind: "ordinary",
      reason: undefined,
    });
    expect(
      await screen.findByRole("heading", { name: /Cancellation received/ }),
    ).toBeInTheDocument();
  });

  it("offers nothing to cancel when no contract runs", () => {
    render(
      <CancelContractForm contract={{ status: "none", periodEnd: null }} />,
    );

    expect(
      screen.getByText(/No subscription runs under your account/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a contract that already ends", () => {
    render(
      <CancelContractForm
        contract={{
          status: "cancelling",
          periodEnd: "2026-12-18T00:00:00.000Z",
        }}
      />,
    );

    expect(
      screen.getByText(/Already cancelled, ends on December 18, 2026/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
