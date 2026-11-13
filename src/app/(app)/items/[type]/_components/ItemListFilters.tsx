"use client";
import { useTranslations } from "next-intl";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import { SortSelect } from "@/app/(app)/_components/SortSelect";
import { TagFilter } from "@/app/(app)/items/[type]/_components/TagFilter";
import {
  ITEM_LIST_SORTS,
  itemListHref,
  type ItemListParams,
} from "@/features/items/domain/list-params";

interface ItemListFiltersProps {
  basePath: string;
  params: ItemListParams;
  tags: string[];
}

// The server sorts and filters, so a change is a navigation. It runs in a
// transition: the current list stays on screen, dimmed through data-pending
// (`group-has-data-pending/list:` on the page), until the new one commits. The
// controls show the choice at once through useOptimistic, and the next change
// builds on it, so two quick changes both land. replace, so Back leaves the
// page instead of stepping through every choice.
export function ItemListFilters({
  basePath,
  params,
  tags,
}: ItemListFiltersProps) {
  const t = useTranslations("pages.items");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(params);

  function change(next: Partial<ItemListParams>) {
    startTransition(() => {
      setShown({ ...shown, ...next });
      router.replace(itemListHref(basePath, shown, next), { scroll: false });
    });
  }

  return (
    <div
      data-pending={isPending ? "" : undefined}
      className="flex flex-wrap items-center gap-2"
    >
      <SortSelect
        sorts={ITEM_LIST_SORTS}
        value={shown.sort}
        onChange={(sort) => change({ sort })}
        ariaLabel={t("sort")}
      />
      {(tags.length > 0 || shown.tag !== null) && (
        <TagFilter
          tags={tags}
          value={shown.tag}
          onChange={(tag) => change({ tag })}
        />
      )}
    </div>
  );
}
