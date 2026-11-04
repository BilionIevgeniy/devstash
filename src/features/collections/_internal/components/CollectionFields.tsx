import { Field } from "@/components/common/Field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DESCRIPTION_MAX,
  NAME_MAX,
  type CollectionFormValues,
} from "@/features/collections/domain/collection-fields";

interface CollectionFieldsProps {
  values: CollectionFormValues;
  onChange: (name: keyof CollectionFormValues, value: string) => void;
}

export function CollectionFields({ values, onChange }: CollectionFieldsProps) {
  return (
    <>
      <Field label="Name">
        {(id) => (
          <Input
            id={id}
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
            maxLength={NAME_MAX}
            required
          />
        )}
      </Field>
      <Field label="Description">
        {(id) => (
          <Textarea
            id={id}
            value={values.description}
            onChange={(event) => onChange("description", event.target.value)}
            maxLength={DESCRIPTION_MAX}
          />
        )}
      </Field>
    </>
  );
}
