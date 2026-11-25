import type { CSSProperties } from "react";

/** A type's colour as ink: the variable it reads and the class that paints. */
export interface TypeInk {
  className: string;
  style: CSSProperties;
}

// A type's colour (ItemType.color, ADR 0031) for an icon or a text. The colour
// is data, so it goes in through the variable --type-color; the class
// `text-type` (globals.css) paints it as stored on a dark ground and darker on
// a light one, where a yellow note would vanish (ADR 0039). Backgrounds and
// borders take the stored colour as it is. One home for both halves: a
// variable without the class paints nothing. Undefined for no colour.
export function typeInk(color: string | null | undefined): TypeInk | undefined {
  if (!color) return undefined;
  return {
    className: "text-type",
    style: { "--type-color": color } as CSSProperties,
  };
}

// A type's colour as a faint tint behind its icon (cards, rows, the drawer's
// header): 10% of the stored colour over the ground, which reads on either
// theme. Undefined for no colour.
export function typeTint(color: string | null | undefined): string | undefined {
  return color ? `color-mix(in oklab, ${color} 10%, transparent)` : undefined;
}
