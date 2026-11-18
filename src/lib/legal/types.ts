export type LegalLang = "de" | "en";

/** A paragraph, or a list whose items are paragraphs. */
export type LegalBlock = string | { items: string[] };

export interface PlainLegalSection {
  /** Unique within a document; builds the heading's id. */
  id: string;
  heading: string;
  blocks: LegalBlock[];
}

/**
 * A legal text kept as plain data, so the page shows it and an email carries
 * it in full (§ 312f BGB: a durable medium, not a link). `{name}` marks a
 * value filled in by `fillLegalText`.
 */
export interface PlainLegalDocument {
  title: string;
  sections: PlainLegalSection[];
}
