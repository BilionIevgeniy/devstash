import type { ReactNode } from "react";

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
