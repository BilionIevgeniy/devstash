"use client";

import { setTheme, useTheme } from "@/components/common/hooks/use-theme";

import { ThemePickerView } from "./ThemePickerView";

interface ThemePickerProps {
  legendClassName?: string;
  className?: string;
}

// The theme picker of the settings page and the marketing footer (ADR 0039),
// on the tab's store: a choice here moves every other picker, the user menu
// and the page at once.
export function ThemePicker(props: ThemePickerProps) {
  const theme = useTheme();
  return <ThemePickerView theme={theme} onChange={setTheme} {...props} />;
}
