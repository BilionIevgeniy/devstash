import {
  Code,
  File,
  Image,
  Link as LinkIcon,
  Sparkles,
  StickyNote,
  Terminal,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

import { typeInk } from "@/features/item-types/components/type-color";
import type { TypeIconName } from "@/features/item-types/domain/custom-type";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<TypeIconName, LucideIcon> = {
  Code,
  Sparkles,
  Terminal,
  StickyNote,
  File,
  Image,
  Link: LinkIcon,
};

interface TypeIconProps extends LucideProps {
  name: string;
  /**
   * The type's colour, painted to read on the theme's ground (typeInk). Not
   * `color`: that is Lucide's stroke, which would take the stored colour as is.
   */
  typeColor?: string | null;
}

export function TypeIcon({
  name,
  typeColor,
  className,
  style,
  ...props
}: TypeIconProps) {
  const Icon = TYPE_ICONS[name as TypeIconName] ?? File;
  const ink = typeInk(typeColor);
  return (
    <Icon
      className={cn(ink?.className, className)}
      style={ink ? { ...ink.style, ...style } : style}
      {...props}
    />
  );
}
