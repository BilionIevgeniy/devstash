import { SkeletonButton } from "@/components/common/skeletons/SkeletonButton";
import { SkeletonText } from "@/components/common/skeletons/SkeletonText";

interface DeletionNoticeSkeletonProps {
  title: string;
  description: string;
  button: string;
}

// The frame of DeletionNotice with the size of its texts.
export function DeletionNoticeSkeleton({
  title,
  description,
  button,
}: DeletionNoticeSkeletonProps) {
  return (
    <div className="max-w-xl space-y-4 rounded-lg border bg-card p-6">
      <SkeletonText className="text-2xl font-bold">{title}</SkeletonText>
      <SkeletonText className="text-sm">{description}</SkeletonText>
      <SkeletonButton>
        <span>{button}</span>
      </SkeletonButton>
    </div>
  );
}
