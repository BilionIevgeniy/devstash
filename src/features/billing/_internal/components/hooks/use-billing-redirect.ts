import { unstable_rethrow } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/action-result";

const START_FAILED = "Couldn't reach billing. Please try again.";

// A successful redirect to Stripe arrives as a rejection and the page then
// navigates away, so the error must go on and isPending holds until unload.
export function useBillingRedirect() {
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) toast.error(result.error ?? START_FAILED);
      } catch (error) {
        unstable_rethrow(error);
        toast.error(START_FAILED);
      }
    });
  }

  return { isPending, run };
}
