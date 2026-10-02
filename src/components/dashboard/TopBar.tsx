import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TopBar() {
  return (
    <header className="flex h-16 items-center gap-4 border-b px-4">
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search items..."
          className="pl-9 pr-14"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border px-1.5 text-xs text-muted-foreground">
          ⌘K
        </kbd>
      </div>
      <Button className="ml-auto">
        <Plus />
        New Item
      </Button>
    </header>
  );
}
