import Link from "next/link";

const PANEL_LINK = "flex min-h-11 items-center text-muted-foreground";

interface MobileNavPanelProps {
  id: string;
  onClose: () => void;
}

export function MobileNavPanel({ id, onClose }: MobileNavPanelProps) {
  return (
    <nav id={id} aria-label="Mobile" className="border-t md:hidden">
      <div className="marketing-container flex flex-col py-2 text-sm">
        <a href="#features" className={PANEL_LINK} onClick={onClose}>
          Features
        </a>
        <a href="#pricing" className={PANEL_LINK} onClick={onClose}>
          Pricing
        </a>
        <Link href="/sign-in" className={PANEL_LINK}>
          Sign In
        </Link>
      </div>
    </nav>
  );
}
