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

const TYPE_ICONS: Record<string, LucideIcon> = {
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
  const Icon = TYPE_ICONS[name] ?? File;
  return <Icon {...props} />;
}
