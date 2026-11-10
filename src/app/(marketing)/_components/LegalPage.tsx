import type { LegalContent } from "../_legal/types";
import { LegalDocument } from "./LegalDocument";

interface LegalPageProps {
  /** `impressum` or `datenschutz`: the ids of the two documents derive from it. */
  slug: string;
  de: LegalContent;
  en: LegalContent;
}

// German first, English below, both on one static page. The jump link lets an
// English reader skip the German text; it is itself marked as English.
export function LegalPage({ slug, de, en }: LegalPageProps) {
  return (
    <main className="marketing-container pt-28 pb-20">
      <div className="mx-auto max-w-3xl wrap-break-word">
        <p className="mb-8 text-sm">
          <a
            lang="en"
            href={`#${slug}-en`}
            className="underline underline-offset-4"
          >
            English version below
          </a>
        </p>
        <LegalDocument id={`${slug}-de`} lang="de" {...de} />
        <hr className="my-16" />
        <LegalDocument id={`${slug}-en`} lang="en" {...en} />
      </div>
    </main>
  );
}
