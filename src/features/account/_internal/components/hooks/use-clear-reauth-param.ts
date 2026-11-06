import { useEffect } from "react";

const SETTINGS_URL = "/settings";

// Drops ?reauth= so a reload or Back does not repeat an old error. Not
// router.replace: a new search string is a new page segment, which would
// remount the dialog that is showing the error.
export function useClearReauthParam(active: boolean) {
  useEffect(() => {
    if (active) window.history.replaceState(null, "", SETTINGS_URL);
  }, [active]);
}
