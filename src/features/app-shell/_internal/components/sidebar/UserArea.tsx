"use client";

import {
  ChevronsUpDown,
  LogOut,
  FileX,
  Scale,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { useSignOut } from "@/features/auth/components/hooks/use-sign-out";
import { LanguageMenu } from "@/features/app-shell/_internal/components/sidebar/LanguageMenu";
import { ThemeMenu } from "@/features/app-shell/_internal/components/sidebar/ThemeMenu";
import { UserAvatar } from "@/features/auth/components/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CANCEL_CONTRACTS_PATH,
  IMPRINT_PATH,
  PRIVACY_PATH,
} from "@/lib/http/legal-paths";
import { SETTINGS_PATH } from "@/features/auth/domain/auth-paths";

interface UserAreaProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function UserArea({ user }: UserAreaProps) {
  const t = useTranslations("shell");
  const signOut = useSignOut();

  return (
    <div className="shrink-0 border-t p-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg p-2 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <UserAvatar
              name={user.name}
              email={user.email}
              image={user.image}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {user.name ?? user.email}
              </p>
              {user.name && user.email && (
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              )}
            </div>
            <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top">
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <User />
              {t("profile")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={SETTINGS_PATH}>
              <Settings />
              {t("settings")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={PRIVACY_PATH}>
              <ShieldCheck />
              {t("privacy")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={IMPRINT_PATH}>
              <Scale />
              {t("imprint")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={CANCEL_CONTRACTS_PATH} prefetch={false} lang="de">
              <FileX />
              {t("cancelContracts")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <ThemeMenu />
          <DropdownMenuSeparator />
          <LanguageMenu />
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void signOut()}>
            <LogOut />
            {t("signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
