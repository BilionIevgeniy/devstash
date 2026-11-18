import "server-only";

import { cache } from "react";
import {
  billingOverviewFor,
  entitlementsFor,
  type Entitlements,
} from "@/features/billing/domain/limits";
import {
  contractStateFor,
  type ContractState,
} from "@/features/billing/domain/cancellation";
import type { BillingOverview } from "@/features/billing/types";
import { prisma } from "@/lib/postgres/prisma";

// The one source of the plan: limits and Pro checks read it here, never from
// the session or the JWT. cache() shares one read per request.
export const getEntitlements = cache(
  async (userId: string): Promise<Entitlements> => {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { status: true },
    });
    return entitlementsFor(subscription?.status ?? null);
  },
);

export const getBillingOverview = cache(
  async (userId: string): Promise<BillingOverview> => {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { status: true, stripeCustomerId: true },
    });
    return billingOverviewFor(subscription);
  },
);

// What the cancellation page offers a signed-in user (§ 312k BGB).
export async function getContractState(userId: string): Promise<ContractState> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      status: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: true,
      stripeSubscriptionId: true,
    },
  });
  return contractStateFor(subscription);
}
