import type { ReactNode } from "react";
import { Layers } from "lucide-react";

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 text-card-foreground">
        <div className="space-y-2 text-center">
          <div className="flex items-center justify-center gap-2">
            <Layers className="size-6 text-primary" />
            <span className="text-lg font-semibold">DevStash</span>
          </div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
