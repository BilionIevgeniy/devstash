import Link from "next/link";

import { PRIVACY_PATH } from "@/lib/legal-paths";

import { OperatorContact } from "../_components/OperatorContact";
import type { LegalContent } from "./types";

export const IMPRESSUM_DE: LegalContent = {
  title: "Impressum",
  sections: [
    {
      id: "provider",
      heading: "Angaben gemäß § 5 DDG",
      body: <OperatorContact lang="de" />,
    },
    {
      id: "privacy",
      heading: "Datenschutz",
      body: (
        <p>
          Wie wir personenbezogene Daten verarbeiten, steht in der{" "}
          <Link href={PRIVACY_PATH}>Datenschutzerklärung</Link>.
        </p>
      ),
    },
  ],
};
