import { Badge } from "@/components/ui/badge";

// The user's own plan, beside the logo and in the billing section. ProBadge is
// the other one: it marks a feature, not a plan.
export function PlanBadge({ isPro }: { isPro: boolean }) {
  if (isPro) {
    return <Badge className="gradient-fill text-background">Pro</Badge>;
  }
  return <Badge variant="secondary">Free</Badge>;
}
