"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus, Shapes } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProBadge } from "@/features/billing/components/ProBadge";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import { CustomTypeDialog } from "@/features/item-types/_internal/components/CustomTypeDialog";
import { CustomTypeListRow } from "@/features/item-types/_internal/components/CustomTypeListRow";
import { CUSTOM_TYPES_MAX } from "@/features/item-types/domain/custom-type";
import type { CustomTypeRow } from "@/features/item-types/types";

interface CustomTypesSectionProps {
  types: CustomTypeRow[];
  isPro: boolean;
  /** Makes the client cache follow a change (ADR 0025); app/ supplies it. */
  sync?: () => Promise<void>;
}

// A Free user with no types sees the upgrade; a former Pro user keeps the list
// and can delete, but not create or edit (ADR 0032).
export function CustomTypesSection({
  types,
  isPro,
  sync,
}: CustomTypesSectionProps) {
  const t = useTranslations("customTypes");
  const canCreate = isPro && types.length < CUSTOM_TYPES_MAX;
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Shapes className="size-4 text-muted-foreground" />
          {t("title")}
          {!isPro && <ProBadge />}
        </h2>
        {canCreate && (
          <CustomTypeDialog
            sync={sync}
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                {t("new")}
              </Button>
            }
          />
        )}
      </div>
      <div className="rounded-lg border bg-card">
        <p className="p-4 text-sm text-muted-foreground">
          {isPro
            ? t("lead")
            : t(types.length > 0 ? "lockedWithTypes" : "locked")}
        </p>
        {types.length > 0 ? (
          <ul className="divide-y border-t">
            {types.map((type) => (
              <CustomTypeListRow
                key={type.id}
                type={type}
                canEdit={isPro}
                sync={sync}
              />
            ))}
          </ul>
        ) : (
          <EmptyFooter isPro={isPro} />
        )}
      </div>
    </section>
  );
}

function EmptyFooter({ isPro }: { isPro: boolean }) {
  const t = useTranslations("customTypes");
  return (
    <div className="border-t p-4 text-sm">
      {isPro ? (
        <span className="text-muted-foreground">{t("empty")}</span>
      ) : (
        <Button asChild size="sm" variant="outline">
          <Link href={UPGRADE_PATH}>{t("upgrade")}</Link>
        </Button>
      )}
    </div>
  );
}
