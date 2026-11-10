import type { Metadata } from "next";

import { LegalPage } from "../_components/LegalPage";
import { IMPRESSUM_DE } from "../_legal/impressum.de";
import { IMPRESSUM_EN } from "../_legal/impressum.en";

export const metadata: Metadata = {
  title: "Impressum / Imprint - DevStash",
  description:
    "Anbieterkennzeichnung nach § 5 DDG. Provider information for DevStash.",
};

export default function ImpressumPage() {
  return <LegalPage slug="impressum" de={IMPRESSUM_DE} en={IMPRESSUM_EN} />;
}
