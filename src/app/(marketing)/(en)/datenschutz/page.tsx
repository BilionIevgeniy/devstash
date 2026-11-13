import type { Metadata } from "next";

import { LegalPage } from "../../_components/LegalPage";
import { GENERAL_DE } from "../../_legal/datenschutz/general.de";
import { GENERAL_EN } from "../../_legal/datenschutz/general.en";
import { RIGHTS_DE } from "../../_legal/datenschutz/rights.de";
import { RIGHTS_EN } from "../../_legal/datenschutz/rights.en";
import { VENDORS_DE } from "../../_legal/datenschutz/vendors.de";
import { VENDORS_EN } from "../../_legal/datenschutz/vendors.en";

export const metadata: Metadata = {
  title: "Datenschutzerklärung / Privacy notice - DevStash",
  description:
    "Information nach Art. 13 DSGVO. Information under Art. 13 GDPR for DevStash.",
};

const DE = {
  title: "Datenschutzerklärung",
  sections: [...GENERAL_DE, ...VENDORS_DE, ...RIGHTS_DE],
};

const EN = {
  title: "Privacy notice",
  sections: [...GENERAL_EN, ...VENDORS_EN, ...RIGHTS_EN],
};

export default function DatenschutzPage() {
  return <LegalPage slug="datenschutz" de={DE} en={EN} />;
}
