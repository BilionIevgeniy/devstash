import type { ReactNode } from "react";

interface DeletionNoticeProps {
  title: string;
  description: string;
  children: ReactNode;
}

// The frame of every state of the page the deletion link opens.
export function DeletionNotice({
  title,
  description,
  children,
}: DeletionNoticeProps) {
  return (
    <section className="max-w-xl space-y-4 rounded-lg border border-destructive/30 bg-card p-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}
