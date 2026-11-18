import { CustomTypesSettings } from "@/app/(app)/settings/_components/CustomTypesSettings";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { getEntitlements } from "@/features/billing/queries";
import { getCustomTypes } from "@/features/item-types/queries";

export async function CustomTypesPanel() {
  const { id: userId } = await getSessionUser();
  const [types, { isPro }] = await Promise.all([
    getCustomTypes(userId),
    getEntitlements(userId),
  ]);
  return <CustomTypesSettings types={types} isPro={isPro} />;
}
