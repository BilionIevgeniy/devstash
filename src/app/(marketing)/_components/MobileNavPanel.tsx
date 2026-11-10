import Link from "next/link";

const PANEL_LINK = "flex min-h-11 items-center text-muted-foreground";

interface MobileNavPanelProps {
  id: string;
  signedIn: boolean;
  onClose: () => void;
}

export function MobileNavPanel({ id, signedIn, onClose }: MobileNavPanelProps) {
  return (
    <nav id={id} aria-label="Mobile" className="border-t md:hidden">
      <div className="marketing-container flex flex-col py-2 text-sm">
        <Link href="/#features" className={PANEL_LINK} onClick={onClose}>
          Features
        </Link>
        <Link href="/#pricing" className={PANEL_LINK} onClick={onClose}>
          Pricing
        </Link>
        {!signedIn && (
          <Link href="/sign-in" className={PANEL_LINK}>
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
