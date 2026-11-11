import { assertOperatorComplete } from "./operator-guard";
import type { LegalLang } from "./types";

interface Operator {
  name: string;
  /** One line each, as they print: street, postcode and town. */
  addressLines: string[];
  /** The country, in the language of the document that prints it. */
  country: Record<LegalLang, string>;
  email: string;
  /** § 5 (1) Nr. 2 DDG: a second means of fast contact next to the email. */
  phone: string;
  /** Only if the operator has one (§ 5 (1) Nr. 6 DDG). */
  vatId?: string;
}

// Every fact about the provider, in one place for the Impressum and the
// privacy notice in both languages. `⟦OPERATOR: …⟧` marks a fact only the owner
// can give: the production build fails while any is left (operator-guard.ts).
export const OPERATOR: Operator = {
  name: "Ievgen Bilion",
  addressLines: ["Wiedemannstraße 45", "53173 Bonn"],
  country: { de: "Deutschland", en: "Germany" },
  email: "ievgenbilion@gmail.com",
  phone: "+49 176 723 62 513",
};

assertOperatorComplete({ ...OPERATOR }, process.env.VERCEL_ENV);
