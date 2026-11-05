import {
  Code,
  File,
  Folder,
  type LucideIcon,
  Search,
  Sparkles,
  Terminal,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { ScrollFadeIn } from "./ScrollFadeIn";
import { SectionHead } from "./SectionHead";
import { TYPE_ACCENTS } from "./type-accents";

interface Feature {
  title: string;
  text: string;
  icon: LucideIcon;
  accent: string;
  pro?: boolean;
}

const FEATURES: Feature[] = [
  {
    title: "Code Snippets",
    text: "Save reusable code with syntax highlighting and copy it in one click.",
    icon: Code,
    accent: TYPE_ACCENTS.snippet,
  },
  {
    title: "AI Prompts",
    text: "Keep your best prompts in one library, ready for any model.",
    icon: Sparkles,
    accent: TYPE_ACCENTS.prompt,
  },
  {
    title: "Instant Search",
    text: "Search content, tags, titles and types. Press ⌘K from anywhere.",
    icon: Search,
    accent: TYPE_ACCENTS.link,
  },
  {
    title: "Commands",
    text: "Your most-used terminal commands, out of bash history.",
    icon: Terminal,
    accent: TYPE_ACCENTS.command,
  },
  {
    title: "Files & Docs",
    text: "Keep project files, images and docs beside your code.",
    icon: File,
    accent: TYPE_ACCENTS.file,
    pro: true,
  },
  {
    title: "Collections",
    text: "Group mixed items by project, topic or workflow.",
    icon: Folder,
    accent: TYPE_ACCENTS.note,
  },
];

// One step per column, so each row of cards comes in from left to right.
const COLUMN_DELAYS = ["", "delay-[60ms]", "delay-[120ms]"];

function FeatureCard({ title, text, icon: Icon, accent, pro }: Feature) {
  return (
    <article
      className={cn(
        "h-full rounded-[14px] border bg-card p-6 transition-[translate,border-color] duration-150 hover:border-[color-mix(in_srgb,var(--type-accent)_40%,transparent)] motion-safe:hover:-translate-y-0.5",
        accent,
      )}
    >
      <span className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--type-accent)_12%,transparent)] text-(--type-accent-text)">
        <Icon className="size-5" />
      </span>
      <h3 className="text-lg leading-[1.35] font-semibold tracking-[-0.01em]">
        {title}
        {pro && (
          <span className="gradient-fill ml-1.5 inline-block rounded-full px-2 py-px align-[2px] text-[11px] font-semibold tracking-normal text-background">
            Pro
          </span>
        )}
      </h3>
      <p className="mt-2 text-muted-foreground">{text}</p>
    </article>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="marketing-section scroll-mt-20">
      <div className="marketing-container">
        <SectionHead
          title="Everything You Need, One Place"
          lead="Stop switching between tools. DevStash keeps your developer resources organized and searchable."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <ScrollFadeIn
              key={feature.title}
              className={cn("h-full", COLUMN_DELAYS[index % 3])}
            >
              <FeatureCard {...feature} />
            </ScrollFadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
