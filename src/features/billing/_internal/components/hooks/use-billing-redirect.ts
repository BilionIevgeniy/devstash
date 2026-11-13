import { unstable_rethrow } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { useErrorText } from "@/components/common/hooks/use-error-text";
import type { ActionResult } from "@/lib/action-result";

// A successful redirect to Stripe arrives as a rejection and the page then
// navigates away, so the error must go on and isPending holds until unload.
export function useBillingRedirect() {
  const [isPending, startTransition] = useTransition();
  const errorText = useErrorText();

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) toast.error(errorText(result));
      } catch (error) {
        unstable_rethrow(error);
        toast.error(errorText("billingUnreachable"));
      }
    });
  }

  return { isPending, run };
}
