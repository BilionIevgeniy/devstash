// The text of the named fields of a submitted form. A field that is missing, or
// holds a file, reads as empty.
export function formValues<Field extends string>(
  formData: FormData,
  names: readonly Field[],
): Record<Field, string> {
  const entries = names.map((name) => {
    const value = formData.get(name);
    return [name, typeof value === "string" ? value : ""] as const;
  });
  return Object.fromEntries(entries) as Record<Field, string>;
}

// Every named field empty: the state a form starts in.
export function emptyFormValues<Field extends string>(
  names: readonly Field[],
): Record<Field, string> {
  return Object.fromEntries(names.map((name) => [name, ""])) as Record<
    Field,
    string
  >;
}
