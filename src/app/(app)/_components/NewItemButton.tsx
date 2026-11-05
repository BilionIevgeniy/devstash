import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CreateMenu } from "@/features/app-shell/components/CreateMenu";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { getEntitlements } from "@/features/billing/queries";
import { CreateItemDialog } from "@/features/items/components/CreateItemDialog";

// Streams into the top bar, so the shell does not wait for the plan. The button
// from `sm` up, the create menu below it.
export async function NewItemButton() {
  const { id: userId } = await getSessionUser();
  const { isPro } = await getEntitlements(userId);

  return (
    <>
      <div className="hidden sm:flex">
        <CreateItemDialog isPro={isPro} />
      </div>
      <div className="flex sm:hidden">
        <CreateMenu isPro={isPro} />
      </div>
    </>
  );
}

// The same controls, inert, while the plan is read.
export function NewItemButtonFallback() {
  return (
    <>
      <Button disabled className="hidden sm:inline-flex">
        <Plus />
        <span>New item</span>
      </Button>
      <Button disabled size="icon" aria-label="Create" className="sm:hidden">
        <Plus />
      </Button>
    </>
  );
}
