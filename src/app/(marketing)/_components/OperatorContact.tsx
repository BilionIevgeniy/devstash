import { OPERATOR } from "../_legal/operator";
import type { LegalLang } from "../_legal/types";

const LABELS: Record<
  LegalLang,
  { email: string; phone: string; vatId: string }
> = {
  de: { email: "E-Mail", phone: "Telefon", vatId: "Umsatzsteuer-ID" },
  en: { email: "Email", phone: "Phone", vatId: "VAT ID" },
};

// The provider's name, address and ways to reach them, for the Impressum and
// for the controller in the privacy notice.
export function OperatorContact({ lang }: { lang: LegalLang }) {
  const labels = LABELS[lang];

  return (
    <address className="not-italic">
      <p>{OPERATOR.name}</p>
      {OPERATOR.addressLines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <p>{OPERATOR.country[lang]}</p>
      <p className="mt-3">
        {labels.email}:{" "}
        <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
      </p>
      <p>
        {labels.phone}:{" "}
        <a href={`tel:${OPERATOR.phone.replaceAll(" ", "")}`}>
          {OPERATOR.phone}
        </a>
      </p>
      {OPERATOR.vatId && (
        <p>
          {labels.vatId}: {OPERATOR.vatId}
        </p>
      )}
    </address>
  );
}
