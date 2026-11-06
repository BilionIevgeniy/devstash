import { useEffect } from "react";
import { toast } from "sonner";

const TOAST_ID = "upgrade-required";
const UPGRADE_NOTICE =
  "Files and images are a Pro feature. Subscribe to open them.";
const SETTINGS_URL = "/settings";

// A Pro user arriving by Back or an old link gets no toast, and the param goes
// either way, so a reload does not repeat it. Not router.replace: a new search
// string is a new page segment, which would remount an open dialog. The fixed
// toast id covers effects that run twice in development.
export function useUpgradeNotice(requested: boolean, isPro: boolean) {
  useEffect(() => {
    if (!requested) return;

    if (!isPro) toast.info(UPGRADE_NOTICE, { id: TOAST_ID });
    window.history.replaceState(null, "", SETTINGS_URL);
  }, [requested, isPro]);
}
