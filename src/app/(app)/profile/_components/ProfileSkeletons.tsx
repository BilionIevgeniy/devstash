import { Skeleton } from "@/components/ui/skeleton";

// Block heights approximate the rendered sections (ProfileInfo, UsageStats at
// desktop width, AccountActions for a user with a password) so the page does
// not shift much when the real content streams in.
const PROFILE_INFO_HEIGHT = "h-30";
const USAGE_STATS_HEIGHT = "h-62";
const CHANGE_PASSWORD_HEIGHT = "h-95";
const DELETE_ACCOUNT_HEIGHT = "h-23";

export function ProfileInfoSkeleton() {
  return <Skeleton className={`${PROFILE_INFO_HEIGHT} rounded-lg`} />;
}

export function UsageStatsSkeleton() {
  return <Skeleton className={`${USAGE_STATS_HEIGHT} rounded-lg`} />;
}

export function AccountActionsSkeleton() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-7 w-32" />
      <Skeleton className={`${CHANGE_PASSWORD_HEIGHT} rounded-lg`} />
      <Skeleton className={`${DELETE_ACCOUNT_HEIGHT} rounded-lg`} />
    </section>
  );
}
