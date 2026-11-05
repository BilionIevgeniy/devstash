"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useScrolled } from "./hooks/use-scrolled";
import { Logo } from "./Logo";
import { MobileNavPanel } from "./MobileNavPanel";

const PANEL_ID = "mobile-nav";
const DESKTOP_LINK = "transition-colors hover:text-foreground";

export function Navbar() {
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const solid = scrolled || open;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-10 border-b backdrop-blur-md transition-colors duration-200",
        solid
          ? "border-border bg-background/88"
          : "border-transparent bg-background/55",
      )}
    >
      <div className="marketing-container flex h-16 items-center gap-8">
        <Logo />
        <nav
          aria-label="Main"
          className="hidden gap-6 text-sm text-muted-foreground md:flex"
        >
          <a href="#features" className={DESKTOP_LINK}>
            Features
          </a>
          <a href="#pricing" className={DESKTOP_LINK}>
            Pricing
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="hidden px-3.5 text-muted-foreground md:inline-flex"
          >
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button asChild size="lg" className="px-3.5">
            <Link href="/register">Get Started</Link>
          </Button>
          <Button
            ref={toggleRef}
            variant="ghost"
            size="icon-lg"
            className="size-11 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls={PANEL_ID}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open && <MobileNavPanel id={PANEL_ID} onClose={() => setOpen(false)} />}
    </header>
  );
}
