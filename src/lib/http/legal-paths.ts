// The public legal pages (app/(marketing)/). Shared by the marketing footer,
// the sign-in cards and the app shell's user menu.
export const PRIVACY_PATH = "/datenschutz";
export const IMPRINT_PATH = "/impressum";
export const TERMS_PATH = "/agb";
/**
 * § 312k BGB: linked on every page, labelled "Verträge hier kündigen". Its
 * links never prefetch: Chromium kept a second prefetch of this page's route
 * tree open after the last byte, on every page, so `networkidle` never came
 * (ADR 0037), and a page few visit gains nothing from it.
 */
export const CANCEL_CONTRACTS_PATH = "/vertraege-kuendigen";

// The withdrawal information on /agb, in the document of one language
// (LegalDocument gives each section the id <page>-<lang>-<section>).
export function withdrawalPath(lang: "de" | "en"): string {
  return `${TERMS_PATH}#agb-${lang}-right`;
}
