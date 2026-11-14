"use client";

import { useEffect, useEffectEvent, useRef } from "react";

import { ShowMore, type ShowMoreProps } from "@/components/common/ShowMore";

// Starts the next page this far before the end of the list comes into view.
const SENTINEL_MARGIN = "400px";

type LoadMoreProps = Omit<ShowMoreProps, "label">;

// The end of an endless list: a sentinel that asks for the next page when it
// comes near the viewport, and the Load more button for the keyboard, screen
// readers and a browser that scrolls no further. A page that arrives while the
// sentinel is still in view sends no new intersection, so the end of each
// load asks again while it stays there. A failed load waits for Try again.
export function LoadMore(props: LoadMoreProps) {
  const { hasMore, isLoading, failed, onLoad } = props;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isInViewRef = useRef(false);

  const loadIfInView = useEffectEvent(() => {
    if (isInViewRef.current && hasMore && !isLoading && !failed) onLoad();
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isInViewRef.current = entry.isIntersecting;
        loadIfInView();
      },
      { rootMargin: SENTINEL_MARGIN },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isLoading) loadIfInView();
  }, [isLoading, hasMore]);

  return (
    <>
      <div ref={sentinelRef} aria-hidden />
      <ShowMore label="loadMore" {...props} />
    </>
  );
}
