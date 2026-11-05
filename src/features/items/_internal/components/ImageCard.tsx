"use client";

import { useState } from "react";

import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { PinMark } from "@/features/items/_internal/components/PinMark";
import { IMAGE_CARD_TITLE_HEIGHT } from "@/features/items/components/ImageGallerySkeleton";
import type { GalleryItem } from "@/features/items/types";
import { cn } from "@/lib/utils";

interface ImageCardProps {
  item: GalleryItem;
}

// A client component for onError: the URL is signed for at least an hour after
// the render, and a thumbnail loaded later (lazy, or revalidated) gets a 403.
// It then shows the type icon, the same as an item without an image, instead
// of the browser's broken-image glyph.
export function ImageCard({ item }: ImageCardProps) {
  const { type, imageUrl } = item;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = imageUrl !== null && imageUrl !== failedUrl;

  return (
    <article className="group overflow-hidden rounded-lg border bg-card">
      <div className="flex aspect-video items-center justify-center overflow-hidden bg-muted">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed R2 URL: next/image would send every one through its optimizer
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailedUrl(imageUrl)}
            className="size-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
          />
        ) : (
          <TypeIcon
            name={type.icon}
            className="size-10 text-muted-foreground"
          />
        )}
      </div>
      <div
        className={cn("flex items-center gap-2 px-3", IMAGE_CARD_TITLE_HEIGHT)}
      >
        <h2 className="truncate text-sm font-medium">{item.title}</h2>
        {item.isPinned && <PinMark color={type.color} />}
      </div>
    </article>
  );
}
