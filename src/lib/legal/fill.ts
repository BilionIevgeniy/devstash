import { OPERATOR } from "@/lib/legal/operator";
import type {
  LegalBlock,
  LegalLang,
  PlainLegalDocument,
} from "@/lib/legal/types";

/**
 * The values a legal text names. The numbers come from the code that enforces
 * them (`billing/domain/limits`), formatted for the language by the caller, so
 * the terms cannot drift from the product. The operator's facts come from
 * `operator.ts`.
 */
export interface LegalValues {
  freeItemLimit: string;
  freeCollectionLimit: string;
  monthlyPrice: string;
  yearlyPrice: string;
}

type AllValues = Record<string, string>;

const PLACEHOLDER = /\{(\w+)\}/g;

function operatorValues(lang: LegalLang): AllValues {
  return {
    operatorName: OPERATOR.name,
    operatorAddress: [...OPERATOR.addressLines, OPERATOR.country[lang]].join(
      ", ",
    ),
    operatorEmail: OPERATOR.email,
    operatorPhone: OPERATOR.phone,
  };
}

function fill(text: string, values: AllValues): string {
  return text.replace(PLACEHOLDER, (match, name: string) => {
    const value = values[name];
    // A name with no value is a typo in the text: never ship it unfilled.
    if (value === undefined) {
      throw new Error(`The legal text names an unknown value: ${match}`);
    }
    return value;
  });
}

function fillBlock(block: LegalBlock, values: AllValues): LegalBlock {
  return typeof block === "string"
    ? fill(block, values)
    : { items: block.items.map((item) => fill(item, values)) };
}

// The text as it is shown and sent: every `{name}` replaced.
export function fillLegalText(
  document: PlainLegalDocument,
  lang: LegalLang,
  values: LegalValues,
): PlainLegalDocument {
  const all: AllValues = { ...values, ...operatorValues(lang) };
  return {
    title: fill(document.title, all),
    sections: document.sections.map((section) => ({
      ...section,
      heading: fill(section.heading, all),
      blocks: section.blocks.map((block) => fillBlock(block, all)),
    })),
  };
}
