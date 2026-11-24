import { MAIN_CONTENT_ID } from "@/components/common/main-content";
import type { LegalContent } from "../../_legal/types";
import { InPageLink } from "../links/InPageLink";
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
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="marketing-container pt-28 pb-20 outline-none"
    >
      <div className="mx-auto max-w-3xl wrap-break-word">
        <p className="mb-8 text-sm">
          <InPageLink
            lang="en"
            href={`#${slug}-en`}
            className="underline underline-offset-4"
          >
            English version below
          </InPageLink>
        </p>
        <LegalDocument id={`${slug}-de`} lang="de" {...de} />
        <hr className="my-16" />
        <LegalDocument id={`${slug}-en`} lang="en" {...en} />
      </div>
    </main>
  );
}
