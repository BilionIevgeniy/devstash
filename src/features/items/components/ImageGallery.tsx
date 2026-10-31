import { ImageCard } from "@/features/items/_internal/components/ImageCard";
import { IMAGE_GALLERY_GRID } from "@/features/items/components/ImageGallerySkeleton";
import { ItemDrawerTrigger } from "@/features/items/components/ItemDrawerTrigger";
import type { GalleryItem } from "@/features/items/types";

interface ImageGalleryProps {
  items: GalleryItem[];
  emptyMessage: string;
}

// The thumbnails are the original uploads: there are no resized copies yet,
// so each card loads the full image (see "Known risks" in docs/architecture.md).
export function ImageGallery({ items, emptyMessage }: ImageGalleryProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className={IMAGE_GALLERY_GRID}>
      {items.map((item) => (
        <ItemDrawerTrigger key={item.id} item={item}>
          <ImageCard item={item} />
        </ItemDrawerTrigger>
      ))}
    </div>
  );
}
