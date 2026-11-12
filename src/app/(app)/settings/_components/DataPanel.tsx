import { getSessionUser } from "@/features/auth/nextauth/session";
import { getEntitlements } from "@/features/billing/queries";
import { DataSection } from "@/features/import-export/components/DataSection";

export async function DataPanel() {
  const { id: userId } = await getSessionUser();
  const { isPro } = await getEntitlements(userId);
  return <DataSection isPro={isPro} />;
}
