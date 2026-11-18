import { describe, expect, it } from "vitest";

import {
  FREE_COLLECTION_LIMIT,
  FREE_ITEM_LIMIT,
} from "@/features/billing/domain/limits";
import { termsValues } from "@/features/billing/domain/terms";

describe("termsValues", () => {
  it("states the limits and prices the code enforces", () => {
    const values = termsValues((amount) => `€${amount}`);

    expect(values).toEqual({
      freeItemLimit: String(FREE_ITEM_LIMIT),
      freeCollectionLimit: String(FREE_COLLECTION_LIMIT),
      monthlyPrice: "€8",
      yearlyPrice: "€72",
    });
  });
});
