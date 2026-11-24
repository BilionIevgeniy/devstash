import { HomeContent, homeMetadata } from "../_components/HomeContent";

const LOCALE = "en";

export function generateMetadata() {
  return homeMetadata(LOCALE);
}

// Static, and the build fails if a change makes it read the request
// (ADR 0024, ADR 0037).
export const ensureStatic = "navigation";

export default function HomePage() {
  return <HomeContent locale={LOCALE} />;
}
