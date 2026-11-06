import { Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import { getEntitlements } from "@/features/billing/queries";
import { cn } from "@/lib/utils";

// The gradient is an image over the variant's background, so the variant's own
// hover would not show.
const GRADIENT = "gradient-fill text-background hover:opacity-90";

// Streams into the top bar, so the shell does not wait for the plan. The label
// from `sm` up, the icon alone below it, where the bar has no room.
export async function UpgradeButton() {
  const { id: userId } = await getSessionUser();
  const { isPro } = await getEntitlements(userId);
  if (isPro) return null;

  return (
    <>
      <Button asChild className={cn(GRADIENT, "hidden sm:inline-flex")}>
        <Link href={UPGRADE_PATH}>
          <Sparkles />
          <span>Upgrade</span>
        </Link>
      </Button>
      <Button asChild size="icon" className={cn(GRADIENT, "sm:hidden")}>
        <Link href={UPGRADE_PATH} aria-label="Upgrade to Pro">
          <Sparkles />
        </Link>
      </Button>
    </>
  );
}
