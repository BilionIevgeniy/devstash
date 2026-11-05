import {
  Code,
  File,
  Image as ImageIcon,
  Link as LinkIcon,
  type LucideIcon,
  Search,
  Sparkles,
  StickyNote,
  Terminal,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { TYPE_ACCENTS } from "./type-accents";

const SIDEBAR: {
  name: string;
  count: number;
  icon: LucideIcon;
  accent: string;
}[] = [
  { name: "Snippets", count: 24, icon: Code, accent: TYPE_ACCENTS.snippet },
  { name: "Prompts", count: 18, icon: Sparkles, accent: TYPE_ACCENTS.prompt },
  { name: "Commands", count: 15, icon: Terminal, accent: TYPE_ACCENTS.command },
  { name: "Notes", count: 12, icon: StickyNote, accent: TYPE_ACCENTS.note },
  { name: "Files", count: 5, icon: File, accent: TYPE_ACCENTS.file },
  { name: "Images", count: 3, icon: ImageIcon, accent: TYPE_ACCENTS.image },
  { name: "Links", count: 8, icon: LinkIcon, accent: TYPE_ACCENTS.link },
];

const CARDS = [
  { title: "useAuth Hook", type: "Snippet", accent: TYPE_ACCENTS.snippet },
  { title: "Code Review Prompt", type: "Prompt", accent: TYPE_ACCENTS.prompt },
  { title: "git rebase", type: "Command", accent: TYPE_ACCENTS.command },
  { title: "Sprint Notes", type: "Note", accent: TYPE_ACCENTS.note },
  { title: "design-tokens.pdf", type: "File", accent: TYPE_ACCENTS.file },
  { title: "hero-banner.png", type: "Image", accent: TYPE_ACCENTS.image },
];

function PreviewSidebar() {
  return (
    <ul className="flex flex-col gap-0.5 border-r px-2 py-2.5">
      {SIDEBAR.map(({ name, count, icon: Icon, accent }) => (
        <li
          key={name}
          className={cn(
            "flex items-center justify-center gap-2 px-1.5 py-1 text-xs text-muted-foreground lg:justify-start",
            accent,
          )}
        >
          <Icon className="size-3.5 shrink-0 text-(--type-accent-text)" />
          <span className="hidden lg:inline">{name}</span>
          <span className="ml-auto hidden font-mono text-[11px] text-dim lg:inline">
            {count}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DashboardPreview() {
  return (
    <div
      role="img"
      aria-label="DevStash dashboard with a sidebar of item types and a grid of item cards"
      className="flex h-80 flex-col overflow-hidden rounded-[14px] border bg-card shadow-[0_24px_80px_-24px_rgba(139,92,246,0.35)] md:h-100"
    >
      <div className="flex h-9 flex-none items-center border-b px-3">
        <span className="flex w-full max-w-60 items-center gap-1.5 text-xs text-dim">
          <Search className="size-3.25" />
          <span>Search items</span>
          <kbd className="ml-auto font-mono text-[11px]">⌘K</kbd>
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[52px_minmax(0,1fr)] lg:grid-cols-[148px_minmax(0,1fr)]">
        <PreviewSidebar />
        <div className="grid auto-rows-fr grid-cols-2 gap-2 p-2.5 md:gap-2.5 md:p-3 lg:grid-cols-3">
          {CARDS.map(({ title, type, accent }) => (
            <div
              key={title}
              className={cn(
                "flex min-w-0 flex-col justify-between gap-1 rounded-lg border border-t-3 border-t-(--type-accent) bg-raised p-2 md:p-2.5",
                accent,
              )}
            >
              <strong className="text-xs leading-[1.35] font-medium wrap-anywhere">
                {title}
              </strong>
              <span className="font-mono text-[11px] text-(--type-accent-text)">
                {type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
