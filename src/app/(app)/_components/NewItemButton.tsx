import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import { CreateMenu } from "@/features/app-shell/components/CreateMenu";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { getEntitlements } from "@/features/billing/queries";
import { getCustomTypeNames } from "@/features/item-types/queries";
import { CreateItemDialog } from "@/features/items/components/CreateItemDialog";
import { cn } from "@/lib/utils";

// Streams into the top bar, so the shell does not wait for the plan. The button
// from `sm` up, the create menu below it.
export async function NewItemButton() {
  const { id: userId } = await getSessionUser();
  const [{ isPro }, customTypeNames] = await Promise.all([
    getEntitlements(userId),
    getCustomTypeNames(userId),
  ]);

  return (
    <>
      <div className="hidden sm:flex">
        <CreateItemDialog isPro={isPro} customTypeNames={customTypeNames} />
      </div>
      <div className="flex sm:hidden">
        <CreateMenu isPro={isPro} customTypeNames={customTypeNames} />
      </div>
    </>
  );
}

// The look of the same controls while the plan is read, as a placeholder of the
// rule "No flash of the wrong state": no control, nothing to reach or to hear.
export function NewItemButtonFallback() {
  const t = useTranslations("shell");

  return (
    <span aria-hidden="true" className="pointer-events-none contents">
      <span className={cn(buttonVariants(), "hidden sm:inline-flex")}>
        <Plus />
        <span>{t("newItem")}</span>
      </span>
      <span className={cn(buttonVariants({ size: "icon" }), "sm:hidden")}>
        <Plus />
      </span>
    </span>
  );
}
