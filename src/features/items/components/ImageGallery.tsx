import { ImageCard } from "@/features/items/_internal/components/ImageCard";
import { ItemFavoriteButton } from "@/features/items/_internal/components/ItemFavoriteButton";
import { IMAGE_GALLERY_GRID } from "@/features/items/components/ImageGallerySkeleton";
import { ItemDrawerTrigger } from "@/features/items/components/ItemDrawerTrigger";
import type { GalleryItem } from "@/features/items/types";

// The star sits on the picture, which can be any color: the backdrop keeps it
// readable. The dark hover repeats because the button's own dark hover wins.
const OVER_IMAGE =
  "bg-background/70 backdrop-blur-sm hover:bg-background/90 dark:hover:bg-background/90";

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
        <ItemDrawerTrigger
          key={item.id}
          item={item}
          action={
            <ItemFavoriteButton
              itemId={item.id}
              title={item.title}
              isFavorite={item.isFavorite}
              className={OVER_IMAGE}
            />
          }
        >
          <ImageCard item={item} />
        </ItemDrawerTrigger>
      ))}
    </div>
  );
}
