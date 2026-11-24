import { useLocale } from "next-intl";
import { toast } from "sonner";

import { useErrorText } from "@/components/common/hooks/use-error-text";
import { signOutUser } from "@/features/auth/actions/sign-in";
import { leaveSession } from "@/features/auth/components/leave-session";
import { homePath } from "@/i18n/config";
import { isNavigationError } from "@/lib/errors/navigation-error";

// The sign-out of the account menu: the action ends the session, then the
// browser loads the homepage of the user's language as a new document
// (leaveSession, ADR 0037). The action's cookie deletion re-renders the page,
// which can redirect to sign-in on its own: that is left the same way, never
// followed as a soft navigation, which would keep the user's pages for Back.
// A failure leaves too, after its toast: the cookie may already be gone with
// a lost answer, and the new document shows the session as it really is.
// No pending mark: the menu closes on the click, and nothing can be sent twice.
export function useSignOut(): () => Promise<void> {
  const home = homePath(useLocale());
  const errorText = useErrorText();

  return async function signOut() {
    try {
      await signOutUser();
    } catch (error) {
      if (!isNavigationError(error)) toast.error(errorText("generic"));
    }
    leaveSession(home);
  };
}
