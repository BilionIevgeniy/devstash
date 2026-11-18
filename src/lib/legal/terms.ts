import { TERMS_DE } from "@/lib/legal/terms.de";
import { TERMS_EN } from "@/lib/legal/terms.en";
import type { LegalLang, PlainLegalDocument } from "@/lib/legal/types";
import { WITHDRAWAL_DE } from "@/lib/legal/withdrawal.de";
import { WITHDRAWAL_EN } from "@/lib/legal/withdrawal.en";

/**
 * The version of the terms and the withdrawal information a customer accepts
 * at the order step. It is stored with the subscription (ADR 0032), so a change
 * of meaning gets a new version and the old texts move to `terms-archive/`
 * with their values written out, as they were agreed.
 */
export const TERMS_VERSION = "2026-11-18";

/** The texts of the current version, in the order the page and the email show them. */
export const CONTRACT_TEXTS: Record<LegalLang, PlainLegalDocument[]> = {
  de: [TERMS_DE, WITHDRAWAL_DE],
  en: [TERMS_EN, WITHDRAWAL_EN],
};
