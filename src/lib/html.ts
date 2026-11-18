// Text that goes into the HTML of an email: auth's links and billing's
// contract confirmation share it.
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** An email as its builders hand it to `sendEmail`. */
export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}
