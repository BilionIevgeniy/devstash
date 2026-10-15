import { Settings } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { mockUser } from "@/lib/mock-data";
import { getInitials } from "@/lib/utils";

export function UserArea() {
  return (
    <div className="flex shrink-0 items-center gap-3 border-t p-4">
      <Avatar>
        <AvatarFallback>{getInitials(mockUser.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{mockUser.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {mockUser.email}
        </p>
      </div>
      <Settings className="ml-auto size-4 shrink-0 text-muted-foreground" />
    </div>
  );
}
