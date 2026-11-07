"use client";

import Link from "next/link";
import type { Ref } from "react";
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

export interface AiStreamButtonLabels {
  /** Before the first answer: "Explain". */
  idle: string;
  /** While a request runs: "Explaining…". */
  pending: string;
  /** Once an answer exists: "Regenerate". */
  again: string;
}

interface AiStreamButtonProps {
  labels: AiStreamButtonLabels;
  canUseAi: boolean;
  hasAnswer: boolean;
  isPending: boolean;
  /** Something else runs on the answer (a save): the button waits. */
  isBlocked?: boolean;
  onClick: () => void;
  /** Where the focus goes back when the controls below it unmount. */
  ref?: Ref<HTMLButtonElement>;
}

const ICON_CLASS = "text-violet-500 dark:text-violet-400";

// The header button of a streamed AI answer: its label changes from idle to
// again, so the focus stays on it. While a request runs it is aria-disabled,
// not disabled, so the focus is not dropped, and a click does nothing.
export function AiStreamButton({
  labels,
  canUseAi,
  hasAnswer,
  isPending,
  isBlocked = false,
  onClick,
  ref,
}: AiStreamButtonProps) {
  if (!canUseAi) return <UpgradeLink label={labels.idle} />;
  const isInactive = isPending || isBlocked;

  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="xs"
      aria-disabled={isInactive}
      onClick={() => {
        if (!isInactive) onClick();
      }}
    >
      {isPending ? (
        <Loader2 className="animate-spin" aria-hidden />
      ) : (
        <Sparkles className={ICON_CLASS} aria-hidden />
      )}
      {isPending ? labels.pending : hasAnswer ? labels.again : labels.idle}
    </Button>
  );
}

// A Free user's button leads to the upgrade page: a tooltip alone would say
// nothing on a phone, where it never opens.
function UpgradeLink({ label }: { label: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild variant="ghost" size="xs">
            <Link
              href={UPGRADE_PATH}
              aria-label={`${label}: a Pro feature, upgrade`}
            >
              <Crown className="text-amber-500" aria-hidden />
              {label}
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{AI_PRO_ONLY_MESSAGE}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
