import { ScrollFadeIn } from "./ScrollFadeIn";

interface SectionHeadProps {
  title: string;
  lead: string;
}

export function SectionHead({ title, lead }: SectionHeadProps) {
  return (
    <ScrollFadeIn className="mx-auto mb-12 max-w-160 text-center">
      <h2 className="marketing-h2">{title}</h2>
      <p className="marketing-lead mt-4">{lead}</p>
    </ScrollFadeIn>
  );
}
