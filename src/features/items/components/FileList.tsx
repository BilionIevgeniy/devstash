import { FileRow } from "@/features/items/_internal/components/FileRow";
import { FILE_LIST } from "@/features/items/components/FileListSkeleton";
import type { FileListItem } from "@/features/items/types";

interface FileListProps {
  items: FileListItem[];
  emptyMessage: string;
}

export function FileList({ items, emptyMessage }: FileListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className={FILE_LIST}>
      {items.map((item) => (
        <FileRow key={item.id} item={item} />
      ))}
    </div>
  );
}
