import { Skeleton } from "@/components/ui/skeleton";

// Block heights approximate the rendered sections (ProfileInfo, UsageStats at
// desktop width) so the page does not shift much when the real content streams
// in.
const PROFILE_INFO_HEIGHT = "h-30";
const USAGE_STATS_HEIGHT = "h-62";

export function ProfileInfoSkeleton() {
  return <Skeleton className={`${PROFILE_INFO_HEIGHT} rounded-lg`} />;
}

export function UsageStatsSkeleton() {
  return <Skeleton className={`${USAGE_STATS_HEIGHT} rounded-lg`} />;
}
