import { MarketingFrame } from "../_components/MarketingFrame";

// The German homepage. Static like `/`: the locale is this constant, never the
// visitor's cookie or browser (ADR 0024).
export default function GermanMarketingLayout({
  children,
}: LayoutProps<"/de">) {
  return <MarketingFrame locale="de">{children}</MarketingFrame>;
}
