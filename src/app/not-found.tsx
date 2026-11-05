import Link from "next/link";

import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";

// Outside the app shell, so a guest sees it too: the homepage suits both, and
// its header offers the dashboard to a signed-in user.
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <ErrorState
        title="Page not found"
        description="This page does not exist or was deleted."
      >
        <Button asChild>
          <Link href="/">Go to the homepage</Link>
        </Button>
      </ErrorState>
    </main>
  );
}
