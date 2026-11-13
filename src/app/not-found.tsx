import Link from "next/link";

import { BilingualErrorText } from "@/components/common/BilingualErrorText";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";

// Outside the app shell, so a guest sees it too: the homepage suits both, and
// its header offers the dashboard to a signed-in user. Bilingual and with no
// request API: the root not-found wraps every page, so reading the locale
// cookie here would turn the static pages (/, /de, the legal pages) dynamic
// (ADR 0024).
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <ErrorState
        title={<BilingualErrorText part="notFoundTitle" />}
        description={<BilingualErrorText part="notFoundDescription" />}
      >
        <Button asChild>
          <Link href="/">
            <BilingualErrorText part="home" />
          </Link>
        </Button>
      </ErrorState>
    </main>
  );
}
