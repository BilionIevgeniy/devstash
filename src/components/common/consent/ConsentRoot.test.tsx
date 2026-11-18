import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, render, screen } from "../../../../test/intl";

const useReportWebVitals = vi.hoisted(() => vi.fn());
vi.mock("next/web-vitals", () => ({ useReportWebVitals }));

import { forgetConsent } from "@/components/common/hooks/use-consent";
import { CONSENT_STORAGE_KEY } from "@/lib/consent";

import { ConsentRoot } from "./ConsentRoot";
import { PrivacySettingsButton } from "./PrivacySettingsButton";

const banner = () =>
  screen.queryByRole("region", { name: "Performance measurement" });

function renderRoot() {
  render(
    <>
      <PrivacySettingsButton />
      <ConsentRoot />
    </>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  forgetConsent();
});

describe("ConsentRoot", () => {
  it("renders nothing on the server, so no answer is guessed", () => {
    expect(renderToString(<ConsentRoot />)).toBe("");
  });

  it("never shows the banner to a visitor who already answered", () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, "1:denied");
    renderRoot();

    expect(banner()).not.toBeInTheDocument();
    expect(useReportWebVitals).not.toHaveBeenCalled();
  });

  it("asks a fresh visitor, measures nothing yet, and starts on Allow", async () => {
    const user = userEvent.setup();
    renderRoot();
    expect(banner()).toBeInTheDocument();
    expect(useReportWebVitals).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Allow" }));

    expect(banner()).not.toBeInTheDocument();
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("1:granted");
    expect(useReportWebVitals).toHaveBeenCalled();
  });

  it("measures nothing after Decline", async () => {
    const user = userEvent.setup();
    renderRoot();

    await user.click(screen.getByRole("button", { name: "Decline" }));

    expect(banner()).not.toBeInTheDocument();
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("1:denied");
    expect(useReportWebVitals).not.toHaveBeenCalled();
  });

  it("opens again from Privacy settings with the focus on it, to withdraw", async () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, "1:granted");
    const user = userEvent.setup();
    renderRoot();
    expect(banner()).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Privacy settings" }));

    expect(banner()).toHaveTextContent("Currently allowed.");
    expect(
      screen.getByRole("heading", { name: "Performance measurement" }),
    ).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Decline" }));
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("1:denied");
    expect(banner()).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Privacy settings" }),
    ).toHaveFocus();
  });

  it("takes an answer for the tab when storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    const user = userEvent.setup();
    renderRoot();

    await user.click(screen.getByRole("button", { name: "Decline" }));

    expect(banner()).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("follows an answer given in another tab", async () => {
    renderRoot();

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: CONSENT_STORAGE_KEY,
          newValue: "1:granted",
        }),
      );
    });

    expect(banner()).not.toBeInTheDocument();
    expect(useReportWebVitals).toHaveBeenCalled();
  });
});
