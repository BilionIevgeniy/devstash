// The public legal pages (app/(marketing)/). Shared by the marketing footer,
// the sign-in cards and the app shell's user menu.
export const PRIVACY_PATH = "/datenschutz";
export const IMPRINT_PATH = "/impressum";
export const TERMS_PATH = "/agb";

// The withdrawal information on /agb, in the document of one language
// (LegalDocument gives each section the id <page>-<lang>-<section>).
export function withdrawalPath(lang: "de" | "en"): string {
  return `${TERMS_PATH}#agb-${lang}-right`;
}
