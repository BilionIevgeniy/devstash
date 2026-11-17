import { Toaster } from "@/components/ui/sonner";

// The one toast region of the app: the root layout renders it, and so does the
// Storybook decorator, so a story's toast sits and looks as in the app.
export function AppToaster() {
  return <Toaster position="top-center" richColors />;
}
