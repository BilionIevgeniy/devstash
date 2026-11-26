import { CreateMenu } from "@/features/app-shell/components/CreateMenu";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { getEntitlements } from "@/features/billing/queries";
import { getCustomTypeNames } from "@/features/item-types/queries";
import { CreateItemDialog } from "@/features/items/components/CreateItemDialog";

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
