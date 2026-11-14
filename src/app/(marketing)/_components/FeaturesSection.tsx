import {
  Code,
  File,
  Folder,
  type LucideIcon,
  Search,
  Sparkles,
  Terminal,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/config";

import { cn } from "@/lib/utils";

import { ScrollFadeIn } from "./ScrollFadeIn";
import { SectionHead } from "./SectionHead";
import { TYPE_ACCENTS } from "./type-accents";

type FeatureId =
  "snippets" | "prompts" | "search" | "commands" | "files" | "collections";

interface Feature {
  id: FeatureId;
  icon: LucideIcon;
  accent: string;
  pro?: boolean;
}

interface FeatureText {
  title: string;
  text: string;
  proLabel: string;
}

const FEATURES: Feature[] = [
  { id: "snippets", icon: Code, accent: TYPE_ACCENTS.snippet },
  { id: "prompts", icon: Sparkles, accent: TYPE_ACCENTS.prompt },
  { id: "search", icon: Search, accent: TYPE_ACCENTS.link },
  { id: "commands", icon: Terminal, accent: TYPE_ACCENTS.command },
  { id: "files", icon: File, accent: TYPE_ACCENTS.file, pro: true },
  { id: "collections", icon: Folder, accent: TYPE_ACCENTS.note },
];

// One step per column, so each row of cards comes in from left to right.
const COLUMN_DELAYS = ["", "delay-[60ms]", "delay-[120ms]"];

function FeatureCard({
  title,
  text,
  proLabel,
  icon: Icon,
  accent,
  pro,
}: Feature & FeatureText) {
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
            {proLabel}
          </span>
        )}
      </h3>
      <p className="mt-2 text-muted-foreground">{text}</p>
    </article>
  );
}

export async function FeaturesSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing.features" });

  return (
    <section id="features" className="marketing-section scroll-mt-20">
      <div className="marketing-container">
        <SectionHead title={t("title")} lead={t("lead")} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <ScrollFadeIn
              key={feature.id}
              className={cn("h-full", COLUMN_DELAYS[index % 3])}
            >
              <FeatureCard
                {...feature}
                title={t(`${feature.id}.title`)}
                text={t(`${feature.id}.text`)}
                proLabel={t("pro")}
              />
            </ScrollFadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
