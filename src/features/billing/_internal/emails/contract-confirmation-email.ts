import {
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_PRICE,
} from "@/features/billing/domain/limits";
import type { SubscriptionConsent } from "@/features/billing/domain/subscription";
import { termsValues } from "@/features/billing/domain/terms";
import type { Locale } from "@/i18n/config";
import { emailFormatter, emailTranslator } from "@/i18n/email-translator";
import { escapeHtml } from "@/lib/html";
import { legalTextHtml, legalTextPlain } from "@/lib/legal/email-text";
import { fillLegalText } from "@/lib/legal/fill";
import { OPERATOR } from "@/lib/legal/operator";
import { contractTextsFor } from "@/lib/legal/terms";

export interface ContractConfirmation {
  locale: Locale;
  period: "monthly" | "yearly";
  startedAt: Date;
  consent: SubscriptionConsent;
}

export interface BuiltContractEmail {
  subject: string;
  html: string;
  text: string;
}

// The contract confirmation on a durable medium (§ 312f BGB, ADR 0032): the
// provider, what was ordered at what price, the stored § 356 (5) consent with
// its time, and the terms and withdrawal information in full, never a link.
// The texts are those of the version the customer accepted.
export function buildContractConfirmationEmail({
  locale,
  period,
  startedAt,
  consent,
}: ContractConfirmation): BuiltContractEmail {
  const t = emailTranslator(locale);
  const format = emailFormatter(locale);
  const price = (amount: number) => format.number(amount, "price");
  const lines = [
    t("contract.provider", {
      name: OPERATOR.name,
      address: [...OPERATOR.addressLines, OPERATOR.country[locale]].join(", "),
      email: OPERATOR.email,
    }),
    t("contract.plan", { period }),
    t("contract.price", {
      period,
      price: price(period === "yearly" ? PRO_YEARLY_PRICE : PRO_MONTHLY_PRICE),
    }),
    t("contract.start", { date: format.dateTime(startedAt, "long") }),
    t("contract.renewal", { period }),
    t("contract.consent", {
      date: format.dateTime(consent.withdrawalWaiverAt, {
        dateStyle: "long",
        timeStyle: "short",
      }),
      version: consent.termsVersion,
    }),
  ];
  const texts = contractTextsFor(consent.termsVersion, locale).map((text) =>
    fillLegalText(text, locale, termsValues(price)),
  );

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827">
  <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(t("contract.heading"))}</h1>
  <p style="margin:0 0 16px;line-height:1.5">${escapeHtml(t("contract.intro"))}</p>
  ${lines.map((line) => `<p style="margin:0 0 8px;line-height:1.5">${escapeHtml(line)}</p>`).join("\n  ")}
  <p style="margin:24px 0 0;line-height:1.5">${escapeHtml(t("contract.texts"))}</p>
  ${texts.map(legalTextHtml).join("\n  ")}
</div>`;
  const text = [
    t("contract.intro"),
    ...lines,
    t("contract.texts"),
    ...texts.map(legalTextPlain),
  ].join("\n\n");

  return { subject: t("contract.subject"), html, text };
}
