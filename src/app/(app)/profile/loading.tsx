import { PageHeader } from "@/app/(app)/_components/PageHeader";
import {
  ProfileInfoSkeleton,
  UsageStatsSkeleton,
} from "@/app/(app)/profile/_components/ProfileSkeletons";

// The page's header and the same skeletons its Suspense boundaries show, so
// nothing moves when the page arrives and its parts stream in.
export default function ProfileLoading() {
  return (
    <div className="space-y-8">
      <PageHeader namespace="pages.profile" />
      <ProfileInfoSkeleton />
      <UsageStatsSkeleton />
    </div>
  );
}
