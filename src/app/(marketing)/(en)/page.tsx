import { HomeContent, homeMetadata } from "../_components/HomeContent";

const LOCALE = "en";

export function generateMetadata() {
  return homeMetadata(LOCALE);
}

export default function HomePage() {
  return <HomeContent locale={LOCALE} />;
}
