import {
  FREE_COLLECTION_LIMIT,
  FREE_ITEM_LIMIT,
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_PRICE,
} from "@/features/billing/domain/limits";

/** The values the contract texts of `lib/legal` name, as strings. */
export interface TermsValues {
  freeItemLimit: string;
  freeCollectionLimit: string;
  monthlyPrice: string;
  yearlyPrice: string;
}

// The numbers the terms state, from the constants that enforce them, so the
// text cannot drift from the product. The caller formats a price for the
// text's language (the page and the email have their own formatter).
export function termsValues(
  formatPrice: (amount: number) => string,
): TermsValues {
  return {
    freeItemLimit: String(FREE_ITEM_LIMIT),
    freeCollectionLimit: String(FREE_COLLECTION_LIMIT),
    monthlyPrice: formatPrice(PRO_MONTHLY_PRICE),
    yearlyPrice: formatPrice(PRO_YEARLY_PRICE),
  };
}
