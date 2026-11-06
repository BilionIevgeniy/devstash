import { getSessionUser } from "@/features/auth/nextauth/session";
import { BillingSection } from "@/features/billing/components/BillingSection";
import { getBillingOverview } from "@/features/billing/queries";
import { getCollectionStats } from "@/features/collections/queries";
import { getItemStats } from "@/features/items/queries";

interface BillingPanelProps {
  searchParams: Promise<{ session_id?: string | string[] }>;
}

export async function BillingPanel({ searchParams }: BillingPanelProps) {
  const { id: userId } = await getSessionUser();
  const [{ session_id: sessionId }, overview, items, collections] =
    await Promise.all([
      searchParams,
      getBillingOverview(userId),
      getItemStats(userId),
      getCollectionStats(userId),
    ]);

  return (
    <BillingSection
      {...overview}
      itemCount={items.total}
      collectionCount={collections.total}
      // ?session_id=a&session_id=b gives an array, and ?session_id= an empty
      // string: neither names a session.
      checkoutSessionId={
        typeof sessionId === "string" && sessionId ? sessionId : null
      }
    />
  );
}
