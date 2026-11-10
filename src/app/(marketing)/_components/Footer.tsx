import Link from "next/link";

import { Logo } from "@/components/common/Logo";
import { IMPRINT_PATH, PRIVACY_PATH } from "@/lib/legal-paths";

interface FooterEntry {
  label: string;
  href: string;
}

// Only pages that exist. A link is added here in the commit that adds its page.
const COLUMNS: { heading: string; entries: FooterEntry[] }[] = [
  {
    heading: "Product",
    entries: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/#pricing" },
    ],
  },
  {
    heading: "Legal",
    entries: [
      { label: "Privacy", href: PRIVACY_PATH },
      { label: "Imprint", href: IMPRINT_PATH },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t pt-16 pb-8">
      <div className="marketing-container">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground">
              Store Smarter. Build Faster.
            </p>
          </div>
          {COLUMNS.map(({ heading, entries }) => (
            <nav key={heading} aria-label={heading}>
              <h3 className="font-mono text-[13px] font-medium">{heading}</h3>
              <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                {entries.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="transition-colors hover:text-foreground"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="mt-12 border-t pt-6 text-[13px] text-dim">
          &copy; {new Date().getFullYear()} DevStash. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
