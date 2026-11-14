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
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/config";

import { cn } from "@/lib/utils";

import { TYPE_ACCENTS } from "./type-accents";

type Translate = Awaited<
  ReturnType<typeof getTranslations<"marketing.preview">>
>;

const SIDEBAR: {
  type:
    | "snippets"
    | "prompts"
    | "commands"
    | "notes"
    | "files"
    | "images"
    | "links";
  count: number;
  icon: LucideIcon;
  accent: string;
}[] = [
  { type: "snippets", count: 24, icon: Code, accent: TYPE_ACCENTS.snippet },
  { type: "prompts", count: 18, icon: Sparkles, accent: TYPE_ACCENTS.prompt },
  { type: "commands", count: 15, icon: Terminal, accent: TYPE_ACCENTS.command },
  { type: "notes", count: 12, icon: StickyNote, accent: TYPE_ACCENTS.note },
  { type: "files", count: 5, icon: File, accent: TYPE_ACCENTS.file },
  { type: "images", count: 3, icon: ImageIcon, accent: TYPE_ACCENTS.image },
  { type: "links", count: 8, icon: LinkIcon, accent: TYPE_ACCENTS.link },
];

// Sample items. A title that is code or a file name stays as it is; a title in
// words is a message.
function cards(t: Translate) {
  return [
    {
      title: "useAuth Hook",
      type: t("type.snippet"),
      accent: TYPE_ACCENTS.snippet,
    },
    {
      title: t("cards.reviewPrompt"),
      type: t("type.prompt"),
      accent: TYPE_ACCENTS.prompt,
    },
    {
      title: "git rebase",
      type: t("type.command"),
      accent: TYPE_ACCENTS.command,
    },
    {
      title: t("cards.sprintNotes"),
      type: t("type.note"),
      accent: TYPE_ACCENTS.note,
    },
    {
      title: "design-tokens.pdf",
      type: t("type.file"),
      accent: TYPE_ACCENTS.file,
    },
    {
      title: "hero-banner.png",
      type: t("type.image"),
      accent: TYPE_ACCENTS.image,
    },
  ];
}

function PreviewSidebar({ t }: { t: Translate }) {
  return (
    <ul className="flex flex-col gap-0.5 border-r px-2 py-2.5">
      {SIDEBAR.map(({ type, count, icon: Icon, accent }) => (
        <li
          key={type}
          className={cn(
            "flex items-center justify-center gap-2 px-1.5 py-1 text-xs text-muted-foreground lg:justify-start",
            accent,
          )}
        >
          <Icon className="size-3.5 shrink-0 text-(--type-accent-text)" />
          <span className="hidden lg:inline">{t(`types.${type}`)}</span>
          <span className="ml-auto hidden font-mono text-[11px] text-dim lg:inline">
            {count}
          </span>
        </li>
      ))}
    </ul>
  );
}

export async function DashboardPreview({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing.preview" });

  return (
    <div
      role="img"
      aria-label={t("label")}
      className="flex h-80 flex-col overflow-hidden rounded-[14px] border bg-card shadow-[0_24px_80px_-24px_rgba(139,92,246,0.35)] md:h-100"
    >
      <div className="flex h-9 flex-none items-center border-b px-3">
        <span className="flex w-full max-w-60 items-center gap-1.5 text-xs text-dim">
          <Search className="size-3.25" />
          <span>{t("search")}</span>
          <kbd className="ml-auto font-mono text-[11px]">⌘K</kbd>
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[52px_minmax(0,1fr)] lg:grid-cols-[148px_minmax(0,1fr)]">
        <PreviewSidebar t={t} />
        <div className="grid auto-rows-fr grid-cols-2 gap-2 p-2.5 md:gap-2.5 md:p-3 lg:grid-cols-3">
          {cards(t).map(({ title, type, accent }) => (
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
