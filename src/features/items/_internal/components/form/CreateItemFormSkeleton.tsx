import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import {
  editableFields,
  type CreatableTypeName,
} from "@/features/items/domain/item-fields";

// The upload field's DropZone: `py-6`, its icon and two lines of text.
const DROP_ZONE_HEIGHT = "h-28";

interface CreateItemFormSkeletonProps {
  typeName: CreatableTypeName;
}

// Stands for CreateItemForm while its chunk loads, with the blocks the type's
// form has (a file, a URL, an editor), so the dialog keeps its size when the
// fields arrive. Rare: the dialog loads the chunk once the page is idle.
export function CreateItemFormSkeleton({
  typeName,
}: CreateItemFormSkeletonProps) {
  const t = useTranslations("items.create");
  const fields = editableFields(typeName);

  return (
    <div className="space-y-6" aria-busy="true" aria-label={t("loading")}>
      <FieldBlock />
      {fields.file && <FieldBlock height={DROP_ZONE_HEIGHT} />}
      <FieldBlock />
      <FieldBlock height="h-16" />
      {fields.url && <FieldBlock />}
      {fields.language && <FieldBlock />}
      {fields.content && <FieldBlock height="h-48" />}
      <FieldBlock />
      <FieldBlock />
      <div className="flex justify-end gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );
}

// A label and its control; the control is as tall as an input unless told.
function FieldBlock({ height = "h-9" }: { height?: string }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className={`${height} w-full`} />
    </div>
  );
}
