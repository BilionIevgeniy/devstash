"use client";

import { useLayoutEffect } from "react";

import { useResolvedTheme } from "@/components/common/hooks/use-theme";
import { DARK_CLASS } from "@/lib/theme";

// Keeps the class of <html> on the theme after the inline script set it
// (ADR 0039): a new choice, another tab, the system switching, and every time
// React puts <html> back with only its own attributes (the remount of Strict
// Mode in development, global-error and its retry). A layout effect, so the
// class lands before the paint. Nothing until hydration is over: the script's
// class is right until then.
export function ThemeSync() {
  const resolved = useResolvedTheme();

  useLayoutEffect(() => {
    if (resolved === undefined) return;
    document.documentElement.classList.toggle(DARK_CLASS, resolved === "dark");
  }, [resolved]);

  return null;
}
