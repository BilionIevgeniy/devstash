import { describe, expect, it } from "vitest";
import { render, screen } from "../../../../test/intl";
import { AuthCard } from "@/features/auth/components/AuthCard";

describe("AuthCard", () => {
  it("leads back to the homepage of the page's language", () => {
    render(
      <AuthCard title="Anmelden" description="">
        <p />
      </AuthCard>,
      { locale: "de" },
    );

    expect(
      screen.getByRole("link", { name: "Zurück zur Startseite" }),
    ).toHaveAttribute("href", "/de");
  });

  it("leads back to / in English", () => {
    render(
      <AuthCard title="Sign in" description="">
        <p />
      </AuthCard>,
    );

    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
