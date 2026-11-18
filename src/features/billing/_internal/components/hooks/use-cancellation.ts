import { useActionState } from "react";

import {
  cancelOwnContract,
  declareCancellation,
} from "@/features/billing/actions/cancellation";
import type { CancellationKind } from "@/features/billing/domain/cancellation";
import { isNavigationError } from "@/lib/errors/navigation-error";
import type { ErrorRef } from "@/i18n/error-codes";

export interface CancellationValues {
  name: string;
  email: string;
  kind: CancellationKind;
  reason: string;
}

export interface CancellationState {
  values: CancellationValues;
  error: ErrorRef | null;
  /** Set once the declaration is in: the screen shows its record. */
  declaredAt: string | null;
}

const EMPTY: CancellationValues = {
  name: "",
  email: "",
  kind: "ordinary",
  reason: "",
};

function readValues(form: FormData): CancellationValues {
  const text = (key: string) => String(form.get(key) ?? "");
  return {
    name: text("name"),
    email: text("email"),
    kind: text("kind") === "extraordinary" ? "extraordinary" : "ordinary",
    reason: text("reason"),
  };
}

// The § 312k form as a plain form: the values come back in the state, so a
// refused or failed declaration keeps what was typed.
export function useCancellation(signedIn: boolean) {
  async function submit(
    _previous: CancellationState,
    form: FormData,
  ): Promise<CancellationState> {
    const values = readValues(form);
    const reason = values.kind === "extraordinary" ? values.reason : undefined;
    try {
      const result = signedIn
        ? await cancelOwnContract({ kind: values.kind, reason })
        : await declareCancellation({ ...values, reason });
      return result.success
        ? { values, error: null, declaredAt: result.data.declaredAt }
        : { values, error: result, declaredAt: null };
    } catch (error) {
      if (isNavigationError(error)) throw error;
      return { values, error: { error: "generic" }, declaredAt: null };
    }
  }

  return useActionState(submit, {
    values: EMPTY,
    error: null,
    declaredAt: null,
  });
}
