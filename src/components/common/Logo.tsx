import { Layers } from "lucide-react";
import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      aria-label="DevStash home"
      className="inline-flex items-center gap-2.5 text-base font-semibold"
    >
      <span className="inline-flex size-7 items-center justify-center rounded-lg bg-linear-135 from-[#3b82f6] to-[#8b5cf6] text-foreground">
        <Layers className="size-4" />
      </span>
      <span>DevStash</span>
    </Link>
  );
}
