"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { Field } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCollectionOptions,
  type CollectionOptionsState,
} from "@/features/items/_internal/components/hooks/use-collection-options";
import {
  collectionChoices,
  collectionSummary,
} from "@/features/items/domain/item-collections";
import type { ItemCollectionRef } from "@/features/items/types";

const NO_LINKS: ItemCollectionRef[] = [];

interface CollectionSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  /** The item's saved collections: named before the options arrive. */
  linked?: ItemCollectionRef[];
  disabled?: boolean;
}

function statusKey(
  options: CollectionOptionsState,
  isEmpty: boolean,
): "loading" | "loadFailed" | "empty" | null {
  if (options.status === "loading") return "loading";
  if (options.status === "error") return "loadFailed";
  return isEmpty ? "empty" : null;
}

// The id goes on the trigger for the label, which leaves the menu's own
// aria-labelledby pointing at nothing, so the menu is named directly. A tick
// keeps the menu open, to pick several.
export function CollectionSelect({
  value,
  onChange,
  linked = NO_LINKS,
  disabled,
}: CollectionSelectProps) {
  const t = useTranslations("items");
  const options = useCollectionOptions();
  const choices = collectionChoices(
    linked,
    options.status === "ready" ? options.collections : [],
  );
  const status = statusKey(options, choices.length === 0);
  const message = status && t(`collectionSelect.${status}`);
  const summary = collectionSummary(choices, value);

  function toggle(id: string, isChecked: boolean) {
    onChange(
      isChecked ? [...value, id] : value.filter((current) => current !== id),
    );
  }

  return (
    <Field label={t("fields.collections")}>
      {(id) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              className="w-full justify-between font-normal"
              disabled={disabled}
            >
              <span className="truncate">
                {summary.kind === "none"
                  ? t("collectionSelect.choose")
                  : summary.kind === "count"
                    ? t("collectionSelect.selected", { count: summary.count })
                    : summary.names}
              </span>
              <ChevronDown className="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            aria-labelledby={undefined}
            aria-label={t("fields.collections")}
            className="max-h-60"
          >
            {choices.map((collection) => (
              <DropdownMenuCheckboxItem
                key={collection.id}
                checked={value.includes(collection.id)}
                onCheckedChange={(next) => toggle(collection.id, next)}
                onSelect={(event) => event.preventDefault()}
              >
                <span className="truncate">{collection.name}</span>
              </DropdownMenuCheckboxItem>
            ))}
            {message && <DropdownMenuItem disabled>{message}</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </Field>
  );
}
