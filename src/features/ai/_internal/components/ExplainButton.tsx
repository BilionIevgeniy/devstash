"use client";

import Link from "next/link";
import { Crown, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AI_PRO_ONLY_MESSAGE } from "@/features/ai/domain/messages";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";

interface ExplainButtonProps {
  canUseAi: boolean;
  /** An explanation exists: the button asks again. */
  hasAnswer: boolean;
  isPending: boolean;
  onClick: () => void;
}

const ICON_CLASS = "text-violet-500 dark:text-violet-400";

// Explain, then Regenerate: one button whose label changes, so the focus stays
// on it. While a request runs it is aria-disabled, not disabled, so the focus
// is not dropped, and a click does nothing.
export function ExplainButton({
  canUseAi,
  hasAnswer,
  isPending,
  onClick,
}: ExplainButtonProps) {
  if (!canUseAi) return <UpgradeToExplain />;

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      aria-disabled={isPending}
      onClick={() => {
        if (!isPending) onClick();
      }}
    >
      {isPending ? (
        <Loader2 className="animate-spin" aria-hidden />
      ) : (
        <Sparkles className={ICON_CLASS} aria-hidden />
      )}
      {isPending ? "Explaining…" : hasAnswer ? "Regenerate" : "Explain"}
    </Button>
  );
}

// A Free user's Explain leads to the upgrade page: a tooltip alone would say
// nothing on a phone, where it never opens.
function UpgradeToExplain() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild variant="ghost" size="xs">
            <Link
              href={UPGRADE_PATH}
              aria-label="Explain: a Pro feature, upgrade"
            >
              <Crown className="text-amber-500" aria-hidden />
              Explain
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{AI_PRO_ONLY_MESSAGE}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
