import { cn } from "@/lib/utils";

import type { LegalContent, LegalLang } from "../_legal/types";

// Only the document itself is a landmark (a region named by its title). The
// sections inside carry no name: about twenty more regions would only clutter
// landmark navigation.
interface LegalDocumentProps extends LegalContent {
  /** Anchor of the document and the prefix of its title's id. */
  id: string;
  /** Sets `lang` on the wrapper: a screen reader switches voice, and the
   *  browser hyphenates German compounds. */
  lang: LegalLang;
}

// Links are underlined in the text, not only on hover: colour alone does not
// separate a link from the words around it.
const BODY_CLASS =
  "mt-3 space-y-3 [&_a]:underline [&_a]:underline-offset-4 [&_h3]:pt-3 [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6";

export function LegalDocument({
  id,
  lang,
  title,
  sections,
}: LegalDocumentProps) {
  return (
    <section
      id={id}
      lang={lang}
      aria-labelledby={`${id}-title`}
      className={cn("scroll-mt-24", lang === "de" && "hyphens-auto")}
    >
      <h1 id={`${id}-title`} className="text-3xl font-bold tracking-tight">
        {title}
      </h1>
      {sections.map((section) => (
        <section key={section.id} className="mt-10">
          <h2 className="text-xl font-semibold">{section.heading}</h2>
          <div className={BODY_CLASS}>{section.body}</div>
        </section>
      ))}
    </section>
  );
}
