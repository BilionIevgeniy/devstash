import { describe, expect, it } from "vitest";

import { buttonVariants } from "@/components/ui/button";
import { typeInk } from "@/features/item-types/components/type-color";
import { cn } from "@/lib/utils";

describe("typeInk", () => {
  it("hands the colour in through the variable, with the class that paints it", () => {
    expect(typeInk("#fde047")).toEqual({
      className: "text-type",
      style: { "--type-color": "#fde047" },
    });
  });

  it("paints nothing for a type with no colour", () => {
    expect(typeInk(undefined)).toBeUndefined();
    expect(typeInk(null)).toBeUndefined();
    expect(typeInk("")).toBeUndefined();
  });

  // The CSS has `hover:text-foreground` after `hover:text-type`, so a set pin
  // keeps its colour on hover only if the merge drops the ghost button's own.
  it("wins over a ghost button's colours when merged after them", () => {
    const classes = cn(
      buttonVariants({
        variant: "ghost",
        className: "text-muted-foreground text-type hover:text-type",
      }),
    ).split(" ");
    expect(classes).toContain("text-type");
    expect(classes).toContain("hover:text-type");
    expect(classes).not.toContain("hover:text-foreground");
    expect(classes).not.toContain("text-muted-foreground");
  });
});
