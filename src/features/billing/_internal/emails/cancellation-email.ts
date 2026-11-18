import type { CancellationKind } from "@/features/billing/domain/cancellation";
import type { Locale } from "@/i18n/config";
import { emailFormatter, emailTranslator } from "@/i18n/email-translator";
import { escapeHtml, type BuiltEmail } from "@/lib/html";

/** What a § 312k declaration said and what it did. */
export interface CancellationRecord {
  locale: Locale;
  kind: CancellationKind;
  reason?: string;
  /** The holder's own name, never a visitor's (ADR 0032). */
  name?: string;
  declaredAt: Date;
  /** When the cancelled subscription ends, if known. */
  periodEnd: Date | null;
}

function effectLine(
  record: CancellationRecord,
  t: ReturnType<typeof emailTranslator>,
  date: (d: Date) => string,
) {
  const { periodEnd } = record;
  return periodEnd
    ? t("cancellation.endsOn", { date: date(periodEnd) })
    : t("cancellation.endsAtTerm");
}

// The confirmation of a cancellation (§ 312k (4) BGB): its content, and the
// date and time of the declaration in Berlin time. Sent to the address on
// file, so it also tells the holder how to resume if they did not send it.
export function buildCancellationEmail(record: CancellationRecord): BuiltEmail {
  const t = emailTranslator(record.locale);
  const format = emailFormatter(record.locale);
  const lines = [
    t("cancellation.received", {
      date: format.dateTime(record.declaredAt, {
        dateStyle: "long",
        timeStyle: "short",
      }),
    }),
    t("cancellation.contract"),
    t("cancellation.kind", { kind: record.kind }),
    ...(record.name ? [t("cancellation.name", { name: record.name })] : []),
    ...(record.reason
      ? [t("cancellation.reason", { reason: record.reason })]
      : []),
    effectLine(record, t, (d) => format.dateTime(d, "long")),
    t("cancellation.resume"),
  ];

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827">
  <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(t("cancellation.heading"))}</h1>
  ${lines.map((line) => `<p style="margin:0 0 8px;line-height:1.5">${escapeHtml(line)}</p>`).join("\n  ")}
</div>`;

  return {
    subject: t("cancellation.subject"),
    html,
    text: lines.join("\n\n"),
  };
}

/** What the operator is told: an extraordinary cancellation, or a failure to finish one. */
export interface OperatorNotice {
  subject: string;
  facts: Record<string, string>;
}

// A plain notice to the operator's own address, in English: it is internal,
// and carries the facts a person needs to finish the case by hand.
export function buildOperatorNotice({
  subject,
  facts,
}: OperatorNotice): BuiltEmail {
  const text = Object.entries(facts)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  return {
    subject: `DevStash: ${subject}`,
    html: `<pre style="font-family:monospace;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
    text,
  };
}
