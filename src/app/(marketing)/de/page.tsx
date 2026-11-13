import { HomeContent, homeMetadata } from "../_components/HomeContent";

const LOCALE = "de";

export function generateMetadata() {
  return homeMetadata(LOCALE);
}

export default function GermanHomePage() {
  return <HomeContent locale={LOCALE} />;
}
