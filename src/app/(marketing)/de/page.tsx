import { HomeContent, homeMetadata } from "../_components/HomeContent";

const LOCALE = "de";

export function generateMetadata() {
  return homeMetadata(LOCALE);
}

// Static, and the build fails if a change makes it read the request
// (ADR 0024, ADR 0037).
export const ensureStatic = "navigation";

export default function GermanHomePage() {
  return <HomeContent locale={LOCALE} />;
}
