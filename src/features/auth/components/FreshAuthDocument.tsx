"use client";

import { useLayoutEffect } from "react";

import { hasShownAppShell } from "@/features/auth/components/app-shell-document";

// In the auth layout: a sign-in page reached by a soft navigation from the app
// (a session that ended on the server) loads again as a new document, before
// it paints, so Back cannot bring the hidden routes of that session back.
export function FreshAuthDocument() {
  useLayoutEffect(() => {
    if (hasShownAppShell()) window.location.replace(window.location.href);
  }, []);
  return null;
}
