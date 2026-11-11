import type { ReactNode } from "react";

export type LegalLang = "de" | "en";

export interface LegalSection {
  /** Unique within a document; builds the heading's id. */
  id: string;
  heading: string;
  body: ReactNode;
}

/** One language of one legal document. */
export interface LegalContent {
  title: string;
  sections: LegalSection[];
}
