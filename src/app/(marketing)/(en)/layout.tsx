import { MarketingFrame } from "../_components/MarketingFrame";

// The English homepage and the legal pages, which are German and English on
// one page: one header for them, which stays mounted when a visitor moves
// between them, so the signed-in state does not flash back to "Get Started".
export default function EnglishMarketingLayout({ children }: LayoutProps<"/">) {
  return <MarketingFrame locale="en">{children}</MarketingFrame>;
}
