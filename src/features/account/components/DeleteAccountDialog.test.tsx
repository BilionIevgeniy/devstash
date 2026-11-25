import { render, screen, waitFor } from "../../../../test/intl";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { fail, ok } from "@/lib/errors/action-result";

const { deleteAccount, requestAccountDeletionLink } = vi.hoisted(() => ({
  deleteAccount: vi.fn(),
  requestAccountDeletionLink: vi.fn(),
}));
vi.mock("@/features/account/_internal/actions/delete-account", () => ({
  deleteAccount,
  requestAccountDeletionLink,
}));

import { DeleteAccountDialog } from "@/features/account/components/DeleteAccountDialog";

const EMAIL = "ada@example.com";

async function openGitHubDialog() {
  const user = userEvent.setup();
  render(<DeleteAccountDialog hasPassword={false} email={EMAIL} />);
  await user.click(screen.getByRole("button", { name: "Delete account" }));
  return user;
}

describe("DeleteAccountDialog without a password", () => {
  it("names the address the link goes to and offers no delete button", async () => {
    await openGitHubDialog();

    expect(screen.getByRole("alertdialog")).toHaveTextContent(EMAIL);
    expect(
      screen.queryByRole("button", { name: "Delete account" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "imprint" })).toHaveAttribute(
      "href",
      "/impressum",
    );
  });

  it("sends the link, says so and moves the focus to Close", async () => {
    const sent = Promise.withResolvers<ReturnType<typeof ok>>();
    requestAccountDeletionLink.mockReturnValue(sent.promise);
    const user = await openGitHubDialog();

    await user.click(
      screen.getByRole("button", { name: "Email me a confirmation link" }),
    );
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();

    sent.resolve(ok());

    expect(await screen.findByRole("status")).toHaveTextContent(
      `Check your inbox at ${EMAIL}.`,
    );
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it("shows a refusal and keeps the send button", async () => {
    requestAccountDeletionLink.mockResolvedValue(
      fail("tooManyAttempts", { minutes: 20 }),
    );
    const user = await openGitHubDialog();

    await user.click(
      screen.getByRole("button", { name: "Email me a confirmation link" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("20");
    // The pending label goes in its own commit, after the one of the error.
    expect(
      await screen.findByRole("button", {
        name: "Email me a confirmation link",
      }),
    ).toBeEnabled();
  });

  it("stays open on Esc while the link is sent", async () => {
    const sent = Promise.withResolvers<ReturnType<typeof ok>>();
    requestAccountDeletionLink.mockReturnValue(sent.promise);
    const user = await openGitHubDialog();
    await user.click(
      screen.getByRole("button", { name: "Email me a confirmation link" }),
    );

    await user.keyboard("{Escape}");

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    sent.resolve(ok());
    await screen.findByRole("status");
    await waitFor(async () => {
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("starts again from the send button once closed and reopened", async () => {
    requestAccountDeletionLink.mockResolvedValue(ok());
    const user = await openGitHubDialog();
    await user.click(
      screen.getByRole("button", { name: "Email me a confirmation link" }),
    );
    await user.click(await screen.findByRole("button", { name: "Close" }));

    await user.click(screen.getByRole("button", { name: "Delete account" }));

    expect(
      screen.getByRole("button", { name: "Email me a confirmation link" }),
    ).toBeInTheDocument();
  });
});

describe("DeleteAccountDialog with a password", () => {
  it("stays open on Esc while the delete runs, and shows its refusal", async () => {
    const deleted = Promise.withResolvers<ReturnType<typeof fail>>();
    deleteAccount.mockReturnValue(deleted.promise);
    const user = userEvent.setup();
    render(<DeleteAccountDialog hasPassword email={EMAIL} />);
    await user.click(screen.getByRole("button", { name: "Delete account" }));
    await user.type(
      screen.getByLabelText("Enter your password to confirm"),
      "pw-123456",
    );
    await user.click(screen.getByRole("button", { name: "Delete account" }));

    await user.keyboard("{Escape}");

    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    deleted.resolve(fail("incorrectPassword"));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("deletes with the typed password", async () => {
    deleteAccount.mockResolvedValue(fail("incorrectPassword"));
    const user = userEvent.setup();
    render(<DeleteAccountDialog hasPassword email={EMAIL} />);
    await user.click(screen.getByRole("button", { name: "Delete account" }));

    await user.type(
      screen.getByLabelText("Enter your password to confirm"),
      "pw-123456",
    );
    await user.click(screen.getByRole("button", { name: "Delete account" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(deleteAccount).toHaveBeenCalledExactlyOnceWith({
      password: "pw-123456",
    });
  });
});
