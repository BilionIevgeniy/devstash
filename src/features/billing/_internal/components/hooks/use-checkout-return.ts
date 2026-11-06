import { unstable_rethrow, useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { toast } from "sonner";

import { confirmCheckout } from "@/features/billing/actions/checkout";

const TOAST_ID = "checkout-return";
const WELCOME = "Welcome to DevStash Pro!";
const NOT_CONFIRMED =
  "We couldn't confirm your payment yet. If you paid, your plan will update shortly.";
const SETTINGS_URL = "/settings";

// isPro is usually true on arrival: Stripe waits for the webhook before the
// redirect. The fixed toast id covers effects that run twice in development.
export function useCheckoutReturn(sessionId: string | null, isPro: boolean) {
  const router = useRouter();
  const [, startConfirming] = useTransition();

  useEffect(() => {
    if (!sessionId) return;

    if (isPro) {
      toast.success(WELCOME, { id: TOAST_ID });
      router.replace(SETTINGS_URL);
      return;
    }

    function settle() {
      toast.info(NOT_CONFIRMED, { id: TOAST_ID });
      router.replace(SETTINGS_URL);
    }

    startConfirming(async () => {
      try {
        const result = await confirmCheckout(sessionId);
        // On success the action's refresh brings isPro, and this effect runs
        // again: the toast arrives with the screen it confirms.
        if (!result.success || !result.data?.isPro) settle();
      } catch (error) {
        unstable_rethrow(error);
        settle();
      }
    });
  }, [sessionId, isPro, router]);

  return { isConfirming: sessionId !== null && !isPro };
}
