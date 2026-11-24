import { useErrorText } from "@/components/common/hooks/use-error-text";
import { useTranslations } from "next-intl";
import { CommandItem, CommandList } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaletteSearch } from "@/features/search/_internal/components/hooks/use-palette-search";
import {
  type MatchHandlers,
  PaletteMatches,
} from "@/features/search/_internal/components/PaletteMatches";
import { paletteView } from "@/features/search/domain/palette-view";

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

function PaletteFailure({ status }: { status: keyof typeof FAILURE_CODES }) {
  const errorText = useErrorText();
  return (
    <p role="alert" className="px-2 py-4 text-center text-sm text-destructive">
      {errorText(FAILURE_CODES[status])}
    </p>
  );
}

function RetryOption({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("search");
  return (
    <CommandItem value="retry" onSelect={onRetry} className="justify-center">
      {t("tryAgain")}
    </CommandItem>
  );
}

function PaletteEmpty() {
  const t = useTranslations("search");
  return (
    <p className="py-6 text-center text-sm" role="status">
      {t("noResults")}
    </p>
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

// What the palette shows under its input, in a box of fixed height: the
// answer for the current text; while it is pending, the last results (their
// options disabled, so dimmed and not selectable), or the skeleton when there
// are none yet; a failure in plain words with a way to retry. The messages sit
// next to the listbox and not in it, which may own options and groups only,
// so a screen reader announces them.
export function PaletteBody({ search, ...handlers }: PaletteBodyProps) {
  const { isLoading, failure, results, isEmpty } = paletteView(search);
  const { isPending } = search;

  return (
    <div className="flex h-72 flex-col">
      {isLoading && <PaletteLoading />}
      {failure && <PaletteFailure status={failure} />}
      {isEmpty && <PaletteEmpty />}
      <CommandList
        className="min-h-0 flex-1"
        aria-busy={isPending || undefined}
        data-pending={isPending ? "" : undefined}
      >
        {failure && <RetryOption onRetry={search.retry} />}
        {results && !isEmpty && (
          <PaletteMatches
            // Mounted anew when the answer comes, also for a row that was there
            // before: cmdk selects a first option only among rows that mount,
            // and would leave aria-activedescendant on a row that is gone.
            key={isPending ? "stale" : "fresh"}
            results={results}
            isStale={isPending}
            footer={
              !isPending &&
              results.nextCursor !== null && <ShowMore search={search} />
            }
            {...handlers}
          />
        )}
      </CommandList>
    </div>
  );
}
