import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

// The user's own plan, beside the logo and in the billing section. ProBadge is
// the other one: it marks a feature, not a plan.
export function PlanBadge({ isPro }: { isPro: boolean }) {
  const t = useTranslations("shell.plan");
  if (isPro) {
    return <Badge className="gradient-fill text-background">{t("pro")}</Badge>;
  }
  return <Badge variant="secondary">{t("free")}</Badge>;
}
