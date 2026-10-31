import Link from "next/link";

import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";

// Outside the app shell: a signed-out visitor follows the link through the
// proxy to sign-in.
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <ErrorState
        title="Page not found"
        description="This page does not exist or was deleted."
      >
        <Button asChild>
          <Link href="/dashboard">Go to the dashboard</Link>
        </Button>
      </ErrorState>
    </main>
  );
}
