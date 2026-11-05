import { CheckList } from "./CheckList";
import { CodeMockup } from "./CodeMockup";
import { GradientBadge } from "./GradientBadge";
import { ScrollFadeIn } from "./ScrollFadeIn";

const CAPABILITIES = [
  "Auto-tag suggestions",
  "AI summaries",
  "Explain Code",
  "Prompt optimization",
];

export function AISection() {
  return (
    <section className="marketing-section">
      <div className="marketing-container grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <ScrollFadeIn>
          <GradientBadge>Pro Feature</GradientBadge>
          <h2 className="marketing-h2 mt-4">AI-Powered Productivity</h2>
          <p className="marketing-lead mt-4">
            Let AI handle the busywork so you can focus on building.
          </p>
          <CheckList items={CAPABILITIES} className="mt-6" />
        </ScrollFadeIn>
        <ScrollFadeIn className="min-w-0">
          <CodeMockup />
        </ScrollFadeIn>
      </div>
    </section>
  );
}
