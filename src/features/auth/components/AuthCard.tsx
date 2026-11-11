import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/common/Logo";
import { IMPRINT_PATH, PRIVACY_PATH } from "@/lib/legal-paths";

const LEGAL_LINK =
  "inline-flex min-h-11 items-center underline underline-offset-4 transition-colors hover:text-foreground";

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
        <div className="space-y-6 rounded-xl border bg-card p-6 text-card-foreground">
          <div className="space-y-2 text-center">
            <div className="flex justify-center">
              <Logo />
            </div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
        <nav
          aria-label="Legal"
          className="flex justify-center gap-6 text-xs text-muted-foreground"
        >
          <Link href={PRIVACY_PATH} className={LEGAL_LINK}>
            Privacy
          </Link>
          <Link href={IMPRINT_PATH} className={LEGAL_LINK}>
            Imprint
          </Link>
        </nav>
      </div>
    </main>
  );
}
