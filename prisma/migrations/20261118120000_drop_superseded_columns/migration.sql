-- The contract step of feature 17 (expand/contract, ADR 0013): the columns were
-- @ignore since that deploy, so no live client selects them any more.
ALTER TABLE "User" DROP COLUMN "isPro",
DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeSubscriptionId";

ALTER TABLE "Item" DROP COLUMN "fileUrl";
