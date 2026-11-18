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

import type { TypeIconName } from "@/features/item-types/domain/custom-type";

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
}

export function TypeIcon({ name, ...props }: TypeIconProps) {
  const Icon = TYPE_ICONS[name as TypeIconName] ?? File;
  return <Icon {...props} />;
}
