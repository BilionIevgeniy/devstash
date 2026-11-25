import { SunMoon } from "lucide-react";
import { useTranslations } from "next-intl";

import { ThemePicker } from "@/components/common/theme/ThemePicker";

// The first section of the settings page: the theme of this browser
// (ADR 0039). The section's heading names the group, so the picker's own
// legend is read out only.
export function AppearancePanel() {
  const t = useTranslations("common.theme");
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <SunMoon className="size-4 text-muted-foreground" />
        {t("label")}
      </h2>
      <div className="rounded-lg border bg-card p-6">
        <ThemePicker legendClassName="sr-only" />
      </div>
    </section>
  );
}
