import type { ReactNode } from "react";
import { Calendar, Folder, Tag, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { typeSlug } from "@/features/item-types/domain/item-type";
import { ItemActionBar } from "@/features/items/_internal/components/ItemActionBar";
import { ItemDrawerSkeleton } from "@/features/items/_internal/components/ItemDrawerSkeleton";
import { ItemEditForm } from "@/features/items/_internal/components/ItemEditForm";
import { formatLongDate } from "@/lib/utils";
import type { DashboardItem, ItemDetailJson } from "@/features/items/types";

export type ItemDetailState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; detail: ItemDetailJson };

interface ItemDrawerContentProps {
  item: DashboardItem;
  state: ItemDetailState;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: (detail: ItemDetailJson) => void;
  onDelete: (id: string) => void;
}

// The header and tags come from the card the user clicked, so they show at
// once; the rest waits for GET /api/items/[id].
export function ItemDrawerContent({
  item,
  state,
  isEditing,
  onEdit,
  onCancelEdit,
  onSaved,
  onDelete,
}: ItemDrawerContentProps) {
  const detail = state.status === "ready" ? state.detail : null;

  if (isEditing && detail) {
    return (
      <>
        <ItemDrawerHeader item={item} language={detail.language} />
        <ItemEditForm
          item={item}
          detail={detail}
          onCancel={onCancelEdit}
          onSaved={onSaved}
        >
          <ItemMeta detail={detail} />
        </ItemEditForm>
      </>
    );
  }

  return (
    <>
      <ItemDrawerHeader item={item} language={detail?.language ?? null} />
      <ItemActionBar
        itemId={item.id}
        title={item.title}
        isFavorite={item.isFavorite}
        isPinned={item.isPinned}
        canEdit={detail !== null}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-6">
        {item.description && (
          <Section title="Description">
            <p>{item.description}</p>
          </Section>
        )}
        {state.status === "loading" && <ItemDrawerSkeleton />}
        {state.status === "error" && (
          <p className="text-destructive">Couldn&apos;t load this item.</p>
        )}
        {detail && <ItemBody detail={detail} />}
        {item.tags.length > 0 && (
          <Section title="Tags" icon={Tag}>
            <ul className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </Section>
        )}
        {detail && <ItemMeta detail={detail} />}
      </div>
    </>
  );
}

interface ItemDrawerHeaderProps {
  item: DashboardItem;
  language: string | null;
}

function ItemDrawerHeader({ item, language }: ItemDrawerHeaderProps) {
  const { type } = item;
  const iconBackground = type.color
    ? `color-mix(in oklab, ${type.color} 10%, transparent)`
    : undefined;

  return (
    <SheetHeader className="flex-row items-start gap-3 p-6 pr-12 pb-2">
      <div
        className="flex size-12 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: iconBackground }}
      >
        <TypeIcon
          name={type.icon}
          className="size-6"
          style={{ color: type.color }}
        />
      </div>
      <div className="min-w-0 space-y-2">
        <SheetTitle className="text-lg">{item.title}</SheetTitle>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="capitalize">
            {typeSlug(type.name)}
          </Badge>
          {language && <Badge variant="outline">{language}</Badge>}
        </div>
      </div>
    </SheetHeader>
  );
}

function ItemBody({ detail }: { detail: ItemDetailJson }) {
  return (
    <>
      {detail.url && (
        <Section title="URL">
          <a
            href={detail.url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-primary underline-offset-4 hover:underline"
          >
            {detail.url}
          </a>
        </Section>
      )}
      {detail.content && (
        <Section title="Content">
          <pre className="overflow-x-auto rounded-md border bg-muted/40 p-4 font-mono text-xs">
            {detail.content}
          </pre>
        </Section>
      )}
    </>
  );
}

function ItemMeta({ detail }: { detail: ItemDetailJson }) {
  return (
    <>
      {detail.collections.length > 0 && (
        <Section title="Collections" icon={Folder}>
          <div className="flex flex-wrap gap-2">
            {detail.collections.map((collection) => (
              <Badge key={collection.id} variant="outline">
                {collection.name}
              </Badge>
            ))}
          </div>
        </Section>
      )}
      <Section title="Details" icon={Calendar}>
        <dl className="space-y-1">
          <DetailRow label="Created" value={detail.createdAt} />
          <DetailRow label="Updated" value={detail.updatedAt} />
        </dl>
      </Section>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>
        <time dateTime={value}>{formatLongDate(new Date(value))}</time>
      </dd>
    </div>
  );
}

interface SectionProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
}

function Section({ title, icon: Icon, children }: SectionProps) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {Icon && <Icon className="size-4" />}
        {title}
      </h3>
      {children}
    </section>
  );
}
