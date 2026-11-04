import { Skeleton } from "@/components/ui/skeleton";

// Block heights approximate AccountActions for a user with a password, so the
// page does not shift much when the real content streams in.
const CHANGE_PASSWORD_HEIGHT = "h-95";
const DELETE_ACCOUNT_HEIGHT = "h-23";

export default function SettingsLoading() {
  return (
    <div className="space-y-8">
      <header>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-1 h-5 w-40" />
      </header>
      <section className="space-y-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className={`${CHANGE_PASSWORD_HEIGHT} rounded-lg`} />
        <Skeleton className={`${DELETE_ACCOUNT_HEIGHT} rounded-lg`} />
      </section>
    </div>
  );
}
