import { unstable_rethrow, useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { confirmCheckout } from "@/features/billing/actions/checkout";

const TOAST_ID = "checkout-return";
const SETTINGS_URL = "/settings";

// isPro is usually true on arrival: Stripe waits for the webhook before the
// redirect. The fixed toast id covers effects that run twice in development.
export function useCheckoutReturn(sessionId: string | null, isPro: boolean) {
  const t = useTranslations("billing.settings");
  // Strings, so the effect lists them: they change only with the language.
  const welcome = t("welcome");
  const notConfirmed = t("notConfirmed");
  const router = useRouter();
  const [, startConfirming] = useTransition();

  useEffect(() => {
    if (!sessionId) return;

    if (isPro) {
      toast.success(welcome, { id: TOAST_ID });
      router.replace(SETTINGS_URL);
      return;
    }

    function settle() {
      toast.info(notConfirmed, { id: TOAST_ID });
      router.replace(SETTINGS_URL);
    }

    startConfirming(async () => {
      try {
        const result = await confirmCheckout(sessionId);
        // On success the action's refresh brings isPro, and this effect runs
        // again: the toast arrives with the screen it confirms.
        if (!result.success || !result.data.isPro) settle();
      } catch (error) {
        unstable_rethrow(error);
        settle();
      }
    });
  }, [sessionId, isPro, router, welcome, notConfirmed]);

  return { isConfirming: sessionId !== null && !isPro };
}
