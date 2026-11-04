"use client";

import { ChevronDown } from "lucide-react";

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

function statusMessage(
  options: CollectionOptionsState,
  isEmpty: boolean,
): string | null {
  if (options.status === "loading") return "Loading…";
  if (options.status === "error") return "Couldn't load your collections";
  return isEmpty ? "No collections yet" : null;
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
  const options = useCollectionOptions();
  const choices = collectionChoices(
    linked,
    options.status === "ready" ? options.collections : [],
  );
  const message = statusMessage(options, choices.length === 0);

  function toggle(id: string, isChecked: boolean) {
    onChange(
      isChecked ? [...value, id] : value.filter((current) => current !== id),
    );
  }

  return (
    <Field label="Collections">
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
                {collectionSummary(choices, value)}
              </span>
              <ChevronDown className="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            aria-labelledby={undefined}
            aria-label="Collections"
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
