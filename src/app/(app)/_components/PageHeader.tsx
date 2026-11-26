interface PageHeaderProps {
  title: string;
  lead: string;
}

// The header of a page whose title and lead need no data: the page and its
// loading.tsx both show it, so nothing about it is a guess.
export function PageHeader({ title, lead }: PageHeaderProps) {
  return (
    <header>
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-muted-foreground">{lead}</p>
    </header>
  );
}
