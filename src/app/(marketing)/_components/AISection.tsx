import { getTranslations } from "next-intl/server";

import { CheckList } from "@/components/common/CheckList";
import { GradientBadge } from "@/components/common/GradientBadge";
import type { Locale } from "@/i18n/config";

import { CodeMockup } from "./CodeMockup";
import { ScrollFadeIn } from "./ScrollFadeIn";

const CAPABILITIES = ["tags", "summaries", "explain", "optimize"] as const;

export async function AISection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing.ai" });

  return (
    <section className="marketing-section">
      <div className="marketing-container grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <ScrollFadeIn>
          <GradientBadge>{t("badge")}</GradientBadge>
          <h2 className="marketing-h2 mt-4">{t("title")}</h2>
          <p className="marketing-lead mt-4">{t("lead")}</p>
          <CheckList
            items={CAPABILITIES.map((capability) => t(capability))}
            className="mt-6"
          />
        </ScrollFadeIn>
        <ScrollFadeIn className="min-w-0">
          <CodeMockup
            codeLabel={t("codeLabel")}
            tagsLabel={t("generatedTags")}
          />
        </ScrollFadeIn>
      </div>
    </section>
  );
}
