import { Footer } from "./_components/Footer";
import { Navbar } from "./_components/Navbar";

// One header for the homepage and the legal pages: it stays mounted when a
// visitor moves between them, so the signed-in state does not flash back to
// "Get Started".
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="text-[15px] leading-[1.6]">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
