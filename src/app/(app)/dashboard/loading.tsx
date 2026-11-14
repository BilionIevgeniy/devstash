import { useTranslations } from "next-intl";
import {
  CollectionsSkeleton,
  ItemsSkeleton,
  PINNED_SKELETON_ROWS,
  RECENT_SKELETON_ROWS,
  StatsSkeleton,
} from "@/app/(app)/dashboard/_components/DashboardSkeletons";

// The page waits for the plan before its own sections stream in.
export default function DashboardLoading() {
  const t = useTranslations("pages.dashboard");
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("lead")}</p>
      </header>
      <StatsSkeleton />
      <CollectionsSkeleton />
      <ItemsSkeleton rows={PINNED_SKELETON_ROWS} />
      <ItemsSkeleton rows={RECENT_SKELETON_ROWS} />
    </div>
  );
}
