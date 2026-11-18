import { describe, expect, it } from "vitest";

import { buildContractConfirmationEmail } from "@/features/billing/_internal/emails/contract-confirmation-email";
import { OPERATOR } from "@/lib/legal/operator";

const CONFIRMATION = {
  locale: "en" as const,
  period: "monthly" as const,
  startedAt: new Date("2026-11-18T09:01:00Z"),
  consent: {
    withdrawalWaiverAt: new Date("2026-11-18T09:00:00Z"),
    termsVersion: "2026-11-18",
  },
};

describe("buildContractConfirmationEmail", () => {
  const email = buildContractConfirmationEmail(CONFIRMATION);

  it("carries the terms and the withdrawal information in full, not a link", () => {
    for (const part of [email.html, email.text]) {
      expect(part).toMatch(/Terms and Conditions/i);
      expect(part).toContain("Model withdrawal form");
      expect(part).toContain("7. When Pro ends");
      expect(part).not.toMatch(/\{\w+\}/);
    }
  });

  it("names the provider, the price with VAT and the consent with its time in Berlin", () => {
    expect(email.text).toContain(OPERATOR.name);
    expect(email.text).toContain("€8 per month, including VAT");
    expect(email.text).toContain("November 18, 2026 at 10:00 AM");
    expect(email.text).toContain("Terms version: 2026-11-18");
  });

  it("is written in German for a German order", () => {
    const german = buildContractConfirmationEmail({
      ...CONFIRMATION,
      locale: "de",
      period: "yearly",
    });
    expect(german.subject).toBe("Dein Vertrag über DevStash Pro");
    expect(german.text).toMatch(/72\s€ pro Jahr/u);
    expect(german.text).toContain("Widerrufsbelehrung");
  });
});
