// Accept and dismiss of an AI suggestion (a tag badge, a summary preview).
// Muted at rest; the action's colour shows on hover and keyboard focus, so
// the target is clear on the dark badge. The dark: variants override the
// ghost button's own dark hover.
export const ACCEPT_CLASS =
  "text-muted-foreground hover:bg-emerald-500/15 hover:text-emerald-600 focus-visible:bg-emerald-500/15 focus-visible:text-emerald-600 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-400 dark:focus-visible:text-emerald-400";
export const DISMISS_CLASS =
  "text-muted-foreground hover:bg-destructive/15 hover:text-destructive focus-visible:bg-destructive/15 focus-visible:text-destructive dark:hover:bg-destructive/15";

// The dashed frame of a suggestion that is not in the form yet.
export const SUGGESTION_FRAME_CLASS =
  "rounded-md border border-dashed bg-muted/50";

// The violet of every AI icon: the Generate and stream buttons, the
// suggestions, and the AI-generated label (ADR 0027).
export const AI_ICON_CLASS = "text-violet-500 dark:text-violet-400";
