import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface AiDataNoteProps {
  /** The id the AI button names in `aria-describedby`. */
  id: string;
  className?: string;
}

// The line that tells a user, before the click, where the content goes. It is
// plain text, not a tooltip: a tooltip never opens on a phone, and a screen
// reader hears nothing from one that is closed.
export function AiDataNote({ id, className }: AiDataNoteProps) {
  const t = useTranslations("ai");
  return (
    <p id={id} className={cn("text-xs text-muted-foreground", className)}>
      {t("dataNotice")}
    </p>
  );
}
