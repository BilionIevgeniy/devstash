-- Expand only (ADR 0013): nullable columns and one with a default, which the
-- live deployment neither selects nor writes.
ALTER TABLE "Subscription" ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "confirmedSubscriptionId" TEXT,
ADD COLUMN     "termsVersion" TEXT,
ADD COLUMN     "withdrawalWaiverAt" TIMESTAMP(3);

-- A subscription that exists before this feature was bought without the order
-- step, so it never gets a § 312f confirmation (ADR 0032): it counts as sent.
UPDATE "Subscription" SET "confirmedSubscriptionId" = "stripeSubscriptionId"
WHERE "stripeSubscriptionId" IS NOT NULL;
