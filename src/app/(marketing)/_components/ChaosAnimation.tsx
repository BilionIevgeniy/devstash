"use client";

import { useEffect, useRef } from "react";

import { CHAOS_ICONS } from "./chaos-icons";
import { startChaos } from "./chaos-simulation";

// Icons stay invisible until startChaos has placed them, so they never show
// clumped in a corner before hydration. Without scripts they sit in a group.
export function ChaosAnimation() {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!boxRef.current) return;
    return startChaos(boxRef.current);
  }, []);

  return (
    <div
      ref={boxRef}
      className="group/chaos relative h-70 overflow-hidden rounded-[14px] border border-dashed border-white/18 bg-chaos no-script:flex no-script:flex-wrap no-script:content-center no-script:justify-center no-script:gap-6 no-script:p-6 md:h-100"
    >
      {CHAOS_ICONS.map(({ name, icon }) => (
        <span
          key={name}
          data-chaos-icon
          aria-hidden="true"
          className="absolute top-0 left-0 flex size-10 items-center justify-center rounded-xl border bg-raised text-muted-foreground opacity-0 transition-opacity duration-300 will-change-transform group-data-ready/chaos:opacity-100 no-script:static no-script:opacity-100 md:size-12"
        >
          {icon}
        </span>
      ))}
    </div>
  );
}
