export const LINK_CLASS =
  "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent";

export function ItemCount({ value }: { value: number }) {
  return <span className="ml-auto text-xs text-muted-foreground">{value}</span>;
}

export function GroupLabel({ children }: { children: string }) {
  return (
    <h3 className="px-2 pb-1 pt-2 text-xs font-medium uppercase text-muted-foreground">
      {children}
    </h3>
  );
}
