import { useErrorText } from "@/components/common/hooks/use-error-text";
import { useTranslations } from "next-intl";
import { CommandItem } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaletteSearch } from "@/features/search/_internal/components/hooks/use-palette-search";
import {
  type MatchHandlers,
  PaletteMatches,
} from "@/features/search/_internal/components/PaletteMatches";

const LOADING_ROWS = [0, 1, 2, 3, 4];

const FAILURE_CODES = {
  error: "searchFailed",
  "rate-limited": "searchRateLimited",
} as const;

interface PaletteBodyProps extends MatchHandlers {
  search: PaletteSearch;
}

function PaletteLoading() {
  const t = useTranslations("search");
  return (
    <div
      className="space-y-1 p-1"
      role="status"
      aria-label={t("loadingSearch")}
    >
      {LOADING_ROWS.map((row) => (
        <Skeleton key={row} className="h-11 w-full rounded-lg" />
      ))}
    </div>
  );
}

function PaletteFailure({
  status,
  onRetry,
}: {
  status: keyof typeof FAILURE_CODES;
  onRetry: () => void;
}) {
  const t = useTranslations("search");
  const errorText = useErrorText();
  return (
    <>
      <p
        role="alert"
        className="px-2 py-4 text-center text-sm text-destructive"
      >
        {errorText(FAILURE_CODES[status])}
      </p>
      <CommandItem value="retry" onSelect={onRetry} className="justify-center">
        {t("tryAgain")}
      </CommandItem>
    </>
  );
}

function ShowMore({ search }: { search: PaletteSearch }) {
  const t = useTranslations("search");
  const label = search.isLoadingMore
    ? t("loading")
    : search.loadMoreFailed
      ? t("loadMoreFailed")
      : t("showMore");
  return (
    <CommandItem
      value="show-more"
      disabled={search.isLoadingMore}
      onSelect={search.loadMore}
      className="justify-center text-muted-foreground"
    >
      {label}
    </CommandItem>
  );
}

// What the list shows: the answer for the current text; while it is pending,
// the last results dimmed and not selectable (or the skeleton when there are
// none yet); a failure in plain words with a way to retry.
export function PaletteBody({ search, ...handlers }: PaletteBodyProps) {
  const t = useTranslations("search");
  const { outcome, previous, isPending } = search;

  if (isPending) {
    if (!previous) return <PaletteLoading />;
    return (
      <div data-pending="" aria-busy="true" className="opacity-50">
        <PaletteMatches results={previous} isStale {...handlers} />
      </div>
    );
  }
  if (!outcome) return <PaletteLoading />;
  if (outcome.status !== "ready") {
    return <PaletteFailure status={outcome.status} onRetry={search.retry} />;
  }

  const { results } = outcome;
  if (results.items.length === 0 && results.collections.length === 0) {
    return (
      <p className="py-6 text-center text-sm" role="status">
        {t("noResults")}
      </p>
    );
  }
  return (
    <PaletteMatches
      results={results}
      isStale={false}
      footer={results.nextCursor !== null && <ShowMore search={search} />}
      {...handlers}
    />
  );
}
