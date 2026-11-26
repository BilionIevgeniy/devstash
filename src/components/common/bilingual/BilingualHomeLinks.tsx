import Link from "next/link";

import { BilingualErrorText } from "@/components/common/bilingual/BilingualErrorText";
import { Button } from "@/components/ui/button";
import { homePath } from "@/i18n/config";

// The way home from the root error and not-found pages, which cannot know the
// locale (BilingualErrorText): one link per language, each to its own
// homepage, so a German visitor is not sent to the English one.
export function BilingualHomeLinks({
  variant = "default",
}: {
  variant?: "default" | "outline";
}) {
  return (
    <>
      <Button asChild variant={variant}>
        <Link href={homePath("en")}>
          <BilingualErrorText part="home" />
        </Link>
      </Button>
      <Button asChild variant={variant}>
        <Link href={homePath("de")} lang="de">
          <BilingualErrorText part="homeDe" />
        </Link>
      </Button>
    </>
  );
}
