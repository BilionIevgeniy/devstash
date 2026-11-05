import { Logo } from "./Logo";

interface FooterEntry {
  label: string;
  // No href: the page does not exist yet, so the entry is plain text.
  href?: string;
}

const COLUMNS: { heading: string; entries: FooterEntry[] }[] = [
  {
    heading: "Product",
    entries: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Changelog" },
    ],
  },
  {
    heading: "Resources",
    entries: [{ label: "Documentation" }, { label: "API" }, { label: "Blog" }],
  },
  {
    heading: "Company",
    entries: [{ label: "About" }, { label: "Privacy" }, { label: "Terms" }],
  },
];

export function Footer() {
  return (
    <footer className="border-t pt-16 pb-8">
      <div className="marketing-container">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-[2fr_1fr_1fr_1fr]">
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
                    {href ? (
                      <a
                        href={href}
                        className="transition-colors hover:text-foreground"
                      >
                        {label}
                      </a>
                    ) : (
                      label
                    )}
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
