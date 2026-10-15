export const LINK_CLASS =
  "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent";

export function ItemCount({ value }: { value: number }) {
  return <span className="ml-auto text-xs text-muted-foreground">{value}</span>;
}
