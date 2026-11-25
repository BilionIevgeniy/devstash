import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { forgetTheme } from "@/components/common/hooks/use-theme";
import { THEME_STORAGE_KEY } from "@/lib/theme";

import { render, screen } from "../../../../test/intl";
import { ThemePicker } from "./ThemePicker";

beforeEach(() => {
  window.localStorage.clear();
  forgetTheme();
});

describe("ThemePicker", () => {
  it("shows the stored choice and stores a new one", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "system");
    render(<ThemePicker />);
    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();

    await userEvent.click(screen.getByRole("radio", { name: "Light" }));
    expect(screen.getByRole("radio", { name: "Light" })).toBeChecked();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  // Two pickers share no radio name, so one never unchecks the other.
  it("keeps two pickers on the same choice", async () => {
    render(
      <>
        <ThemePicker />
        <ThemePicker />
      </>,
    );
    const [first, second] = screen.getAllByRole("radio", { name: "Light" });
    await userEvent.click(first);
    expect(first).toBeChecked();
    expect(second).toBeChecked();
    expect(screen.getAllByRole("radio", { name: "Dark" })[0]).not.toBeChecked();
  });

  it("is labelled in German", () => {
    render(<ThemePicker />, { locale: "de" });
    expect(screen.getByRole("group", { name: "Darstellung" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "Dunkel" })).toBeChecked();
  });
});
