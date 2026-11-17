import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { AI_ICON_CLASS } from "@/features/ai/_internal/components/suggestion-classes";

interface AiGeneratedLabelProps {
  /**
   * `text`: the icon and "AI-generated", for the drawer and the item page.
   * `icon`: the icon alone and decorative, for cards and rows, whose
   * accessible name would grow with every mark; the element it stands by
   * carries the attribute (ADR 0027).
   */
  variant?: "text" | "icon";
  /** `icon` only: a screen reader hears "AI-generated" (outside a button). */
  spoken?: boolean;
  className?: string;
}

// The visible hint next to a value that is an accepted AI output. The
// machine-readable mark is the `data-ai-generated` attribute (aiMarkProps).
export function AiGeneratedLabel({
  variant = "text",
  spoken = false,
  className,
}: AiGeneratedLabelProps) {
  const t = useTranslations("ai.marking");
  const icon = (
    <Sparkles
      aria-hidden
      className={cn(
        "size-3 shrink-0",
        AI_ICON_CLASS,
        variant === "icon" && className,
      )}
    />
  );
  if (variant === "icon") {
    if (!spoken) return icon;
    return (
      <>
        {icon}
        <span className="sr-only">{t("label")}</span>
      </>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-normal text-muted-foreground",
        className,
      )}
    >
      {icon}
      {t("label")}
    </span>
  );
}
