"use client";

import { useTranslations } from "next-intl";

import { Field } from "@/components/common/Field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CancellationValues } from "@/features/billing/_internal/components/hooks/use-cancellation";
import {
  CANCELLATION_NAME_MAX,
  CANCELLATION_REASON_MAX,
  type CancellationKind,
} from "@/features/billing/domain/cancellation";

interface CancellationFieldsProps {
  values: CancellationValues;
  /** A signed-in user's contract is known: no name or email to give. */
  signedIn: boolean;
  /** The types offered; a single one is chosen already. */
  kinds: readonly CancellationKind[];
  disabled: boolean;
}

// The data § 312k (2) BGB lets the form ask for: who cancels (signed out),
// the type, and the reason of a cancellation for good cause.
export function CancellationFields({
  values,
  signedIn,
  kinds,
  disabled,
}: CancellationFieldsProps) {
  const t = useTranslations("billing.cancel");

  return (
    <>
      {!signedIn && (
        <>
          <Field label={t("name")}>
            {(id) => (
              <Input
                id={id}
                name="name"
                required
                autoComplete="name"
                maxLength={CANCELLATION_NAME_MAX}
                defaultValue={values.name}
                disabled={disabled}
              />
            )}
          </Field>
          <Field label={t("email")}>
            {(id) => (
              <Input
                id={id}
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue={values.email}
                disabled={disabled}
              />
            )}
          </Field>
        </>
      )}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-muted-foreground">
          {t("kind")}
        </legend>
        {kinds.map((kind) => (
          <label
            key={kind}
            className="flex items-center gap-2 text-sm max-md:min-h-11"
          >
            <input
              type="radio"
              name="kind"
              value={kind}
              defaultChecked={kinds.length === 1 || values.kind === kind}
              disabled={disabled}
              className="accent-primary"
            />
            {t(kind)}
          </label>
        ))}
      </fieldset>
      <Field label={t("reason")}>
        {(id) => (
          <Textarea
            id={id}
            name="reason"
            maxLength={CANCELLATION_REASON_MAX}
            defaultValue={values.reason}
            disabled={disabled}
          />
        )}
      </Field>
    </>
  );
}
