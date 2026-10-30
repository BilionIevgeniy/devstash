import "server-only";

import { cache } from "react";
import {
  entitlementsFor,
  type Entitlements,
} from "@/features/billing/domain/limits";
import { prisma } from "@/lib/prisma";

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
