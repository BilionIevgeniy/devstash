import { getFormatter } from "next-intl/server";

import { termsValues } from "@/features/billing/domain/terms";
import { fillLegalText } from "@/lib/legal/fill";
import { CONTRACT_TEXTS, TERMS_VERSION } from "@/lib/legal/terms";
import type {
  LegalBlock,
  LegalLang,
  PlainLegalDocument,
} from "@/lib/legal/types";

import type { LegalContent, LegalSection } from "../../_legal/types";

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") return <p>{block}</p>;
  return (
    <ul>
      {block.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function toSections(
  document: PlainLegalDocument,
  headingPrefix?: string,
): LegalSection[] {
  return document.sections.map((section) => ({
    id: section.id,
    heading: headingPrefix
      ? `${headingPrefix}: ${section.heading}`
      : section.heading,
    body: section.blocks.map((block, index) => (
      <Block key={index} block={block} />
    )),
  }));
}

// The terms and the withdrawal information of the current version, filled
// with the numbers of the code, for one language of the /agb page. The same
// data goes into the § 312f confirmation email (ADR 0032).
export async function contractContent(lang: LegalLang): Promise<LegalContent> {
  const format = await getFormatter({ locale: lang });
  const values = termsValues((amount) => format.number(amount, "price"));
  const [terms, withdrawal] = CONTRACT_TEXTS[lang].map((text) =>
    fillLegalText(text, lang, values),
  );
  return {
    title: `${terms.title} (${TERMS_VERSION})`,
    sections: [
      ...toSections(terms),
      ...toSections(withdrawal, withdrawal.title),
    ],
  };
}
