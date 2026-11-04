import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { typeSlug } from "@/features/item-types/domain/item-type";
import { FileList } from "@/features/items/components/FileList";
import { ImageGallery } from "@/features/items/components/ImageGallery";
import { ItemList } from "@/features/items/components/ItemList";
import type { CollectionSection } from "@/features/items/types";

const EMPTY_MESSAGE = "No items in this collection yet.";

interface CollectionSectionsProps {
  sections: CollectionSection[];
}

export function CollectionSections({ sections }: CollectionSectionsProps) {
  if (sections.length === 0) {
    return <p className="text-sm text-muted-foreground">{EMPTY_MESSAGE}</p>;
  }

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.type.id} className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold capitalize">
            <TypeIcon
              name={section.type.icon}
              className="size-5"
              style={{ color: section.type.color }}
            />
            {typeSlug(section.type.name)}
            <span className="text-sm font-normal text-muted-foreground">
              {section.totalCount}
            </span>
          </h2>
          {section.listing === "gallery" && (
            <ImageGallery items={section.items} emptyMessage={EMPTY_MESSAGE} />
          )}
          {section.listing === "files" && (
            <FileList items={section.items} emptyMessage={EMPTY_MESSAGE} />
          )}
          {section.listing === "cards" && (
            <ItemList items={section.items} emptyMessage={EMPTY_MESSAGE} />
          )}
        </section>
      ))}
    </div>
  );
}
