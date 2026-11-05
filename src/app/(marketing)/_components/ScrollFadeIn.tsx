"use client";

import { type ReactNode, useEffect, useRef } from "react";

interface ScrollFadeInProps {
  children: ReactNode;
  className?: string;
}

// Renders visible and hides itself only while it is below the viewport, so
// nothing flashes and a failed script leaves the content readable.
export function ScrollFadeIn({ children, className }: ScrollFadeInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const belowViewport =
      element.getBoundingClientRect().top > window.innerHeight;
    if (reducedMotion.matches || !belowViewport) return;

    element.dataset.reveal = "hidden";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        element.dataset.reveal = "shown";
        observer.disconnect();
      },
      { threshold: 0.1 },
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      delete element.dataset.reveal;
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
