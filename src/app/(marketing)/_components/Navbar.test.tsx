import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, within } from "../../../../test/intl";

const { useHasSession, primeSessionCheck } = vi.hoisted(() => ({
  useHasSession: vi.fn(),
  primeSessionCheck: vi.fn(),
}));
vi.mock("@/features/auth/components/hooks/use-has-session", () => ({
  useHasSession,
  primeSessionCheck,
}));

import { Navbar } from "./Navbar";

async function openMenu() {
  render(<Navbar />);
  await userEvent.click(screen.getByRole("button", { expanded: false }));
  return within(screen.getByRole("navigation", { name: "Mobile" }));
}

// The menu of the phone, which has the sign-in link the bar has no room for.
describe("the navbar's mobile menu", () => {
  beforeEach(() => {
    useHasSession.mockReturnValue(false);
  });

  it("offers a guest to sign in", async () => {
    const menu = await openMenu();

    expect(menu.getByRole("link", { name: "Sign In" })).toBeInTheDocument();
  });

  it.each([null, true])(
    "shows no sign-in link while the session is %s",
    async (hasSession) => {
      useHasSession.mockReturnValue(hasSession);
      const menu = await openMenu();

      expect(menu.queryByRole("link", { name: "Sign In" })).toBeNull();
    },
  );

  // A signed-in answer removes the row; nothing may be under it.
  it("puts the row that depends on the session last", async () => {
    const menu = await openMenu();

    expect(menu.getAllByRole("link").at(-1)).toHaveAccessibleName("Sign In");
  });
});
