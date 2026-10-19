import type { ComponentProps } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface UserAvatarProps
  extends Pick<ComponentProps<typeof Avatar>, "size" | "className"> {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

function getFallbackText(name?: string | null, email?: string | null): string {
  const initials = getInitials(name?.trim() ?? "");
  if (initials) return initials;
  return email?.trim()[0]?.toUpperCase() ?? "?";
}

export function UserAvatar({
  name,
  email,
  image,
  size,
  className,
}: UserAvatarProps) {
  return (
    <Avatar size={size} className={className}>
      {image && <AvatarImage src={image} alt={name ?? "User avatar"} />}
      <AvatarFallback>{getFallbackText(name, email)}</AvatarFallback>
    </Avatar>
  );
}
