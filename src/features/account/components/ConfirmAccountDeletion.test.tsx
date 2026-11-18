import { render, screen } from "../../../../test/intl";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { fail } from "@/lib/errors/action-result";

const { deleteAccount } = vi.hoisted(() => ({ deleteAccount: vi.fn() }));
vi.mock("@/features/account/_internal/actions/delete-account", () => ({
  deleteAccount,
  requestAccountDeletionLink: vi.fn(),
}));

import { ConfirmAccountDeletion } from "@/features/account/components/ConfirmAccountDeletion";

describe("ConfirmAccountDeletion", () => {
  it("deletes with the link's token, pending until the answer", async () => {
    const answer = Promise.withResolvers<ReturnType<typeof fail>>();
    deleteAccount.mockReturnValue(answer.promise);
    const user = userEvent.setup();
    render(<ConfirmAccountDeletion token="tok-1" />);

    await user.click(
      screen.getByRole("button", { name: "Delete account permanently" }),
    );

    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    expect(deleteAccount).toHaveBeenCalledExactlyOnceWith({ token: "tok-1" });

    answer.resolve(fail("invalidDeletionLink"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This confirmation link is invalid or has expired.",
    );
    expect(
      screen.getByRole("button", { name: "Delete account permanently" }),
    ).toBeEnabled();
  });
});
