import Link from "next/link";

import { PRIVACY_PATH } from "@/lib/legal-paths";

import { OperatorContact } from "../_components/OperatorContact";
import type { LegalContent } from "./types";

export const IMPRESSUM_EN: LegalContent = {
  title: "Imprint",
  sections: [
    {
      id: "provider",
      heading: "Provider information under § 5 DDG",
      body: (
        <>
          <OperatorContact lang="en" />
          <p>
            This English text is a courtesy translation. The German text above
            is the binding one.
          </p>
        </>
      ),
    },
    {
      id: "privacy",
      heading: "Data protection",
      body: (
        <p>
          How personal data is processed is described in the{" "}
          <Link href={PRIVACY_PATH}>privacy notice</Link>.
        </p>
      ),
    },
  ],
};
