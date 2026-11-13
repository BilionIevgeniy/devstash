import { describe, expect, it } from "vitest";

import { buildPasswordResetEmail } from "@/features/auth/_internal/emails/password-reset-email";
import { buildVerificationEmail } from "@/features/auth/_internal/emails/verification-email";

const URL = "https://devstash.dev/verify-email?token=a&email=ada%40example.com";

// The email is written in the language of the request that asked for it.
describe("the action emails", () => {
  it("are English by the locale passed in, with the expiry in hours", () => {
    const email = buildVerificationEmail(URL, 24, "en");

    expect(email.subject).toBe("Verify your DevStash email");
    expect(email.text).toContain("This link expires in 24 hours.");
    expect(email.text).toContain(URL);
  });

  it("are German by the locale passed in, singular and plural", () => {
    const verification = buildVerificationEmail(URL, 24, "de");
    const reset = buildPasswordResetEmail(URL, 1, "de");

    expect(verification.subject).toBe(
      "Bestätige deine E-Mail-Adresse für DevStash",
    );
    expect(verification.html).toContain("E-Mail bestätigen");
    expect(verification.text).toContain("Dieser Link läuft in 24 Stunden ab.");
    expect(reset.subject).toBe("Setze dein DevStash-Passwort zurück");
    expect(reset.text).toContain("Dieser Link läuft in 1 Stunde ab.");
  });

  it("escapes the link in the HTML part", () => {
    const { html } = buildVerificationEmail(URL, 24, "en");

    expect(html).toContain("token=a&amp;email=ada%40example.com");
    expect(html).not.toContain("token=a&email");
  });
});
