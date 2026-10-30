import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { getEntitlements } from "@/features/billing/queries";
import { CreateItemDialog } from "@/features/items/components/CreateItemDialog";

const CLASS_NAME = "ml-auto";

// Streams into the top bar, so the shell does not wait for the plan.
export async function NewItemButton() {
  const { id: userId } = await getSessionUser();
  const { isPro } = await getEntitlements(userId);

  return <CreateItemDialog isPro={isPro} className={CLASS_NAME} />;
}

// The same button, inert, while the plan is read.
export function NewItemButtonFallback() {
  return (
    <Button className={CLASS_NAME} disabled>
      <Plus />
      <span>New item</span>
    </Button>
  );
}
