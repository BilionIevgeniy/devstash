import {
  ProfileInfoSkeleton,
  UsageStatsSkeleton,
} from "@/app/(app)/profile/_components/ProfileSkeletons";
import { Skeleton } from "@/components/ui/skeleton";

// The page's header and the same skeletons its Suspense boundaries show, so
// nothing moves when the page arrives and its parts stream in.
export default function ProfileLoading() {
  return (
    <div className="space-y-8">
      <header>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-1 h-5 w-64" />
      </header>
      <ProfileInfoSkeleton />
      <UsageStatsSkeleton />
    </div>
  );
}
