import { Skeleton } from "@/components/ui/skeleton";

// Shared with EditorPreferencesSection, so the skeleton has its columns.
export const PREFERENCES_CARD =
  "grid gap-6 rounded-lg border bg-card p-6 sm:grid-cols-2";

const SELECTS = 3;
const SWITCHES = 2;

export function EditorPreferencesSkeleton() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-7 w-32" />
      <div className={PREFERENCES_CARD}>
        {Array.from({ length: SELECTS }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-8 w-full max-md:h-11" />
          </div>
        ))}
        {Array.from({ length: SWITCHES }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-5 w-20" />
            {/* The switch is inline: its box is a line of text. */}
            <div className="h-6">
              <Skeleton className="h-[18.4px] w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
