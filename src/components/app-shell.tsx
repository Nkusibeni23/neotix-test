"use client";

import {
  BarChart3Icon,
  InboxIcon,
  LogOutIcon,
  MenuIcon,
  UploadIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "cn";

import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasToken, useIsClient, useLogout, useMe } from "@/lib/auth";
import { useLiveUpdates, type LiveState } from "@/lib/live";
import type { Role, User } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

const NAV: NavItem[] = [
  { href: "/requests", label: "Requests", icon: InboxIcon, roles: ["client", "operator", "admin"] },
  { href: "/import", label: "Import", icon: UploadIcon, roles: ["operator", "admin"] },
  { href: "/analytics", label: "Analytics", icon: BarChart3Icon, roles: ["operator", "admin"] },
  { href: "/users", label: "Users", icon: UsersIcon, roles: ["admin"] },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function NavLinks({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
  const pathname = usePathname();
  return NAV.filter((n) => n.roles.includes(user.role)).map(({ href, label, icon: Icon }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="size-4" />
        {label}
      </Link>
    );
  });
}

function UserMenu({ user }: { user: User }) {
  const logout = useLogout();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="h-10 gap-2.5 pr-2 pl-1.5">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials(user.name)}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-medium">{user.name}</span>
              <span className="block text-xs text-muted-foreground capitalize">{user.role}</span>
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2.5 py-2">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <Badge variant="secondary" className="mt-2 capitalize">
            {user.role}
          </Badge>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Silent while live updates work; only speaks up when they've dropped and are retrying. */
function ConnectionNotice({ state }: { state: LiveState }) {
  if (state !== "offline") return null;
  return (
    <span
      role="status"
      title="Live updates paused. Retrying automatically; the page still works."
      className="inline-flex items-center gap-1.5 rounded-full border border-status-in-progress/30 bg-status-in-progress/10 px-2.5 py-1 text-xs font-medium text-status-in-progress"
    >
      <span className="size-2 animate-pulse rounded-full bg-status-in-progress" />
      Reconnecting…
    </span>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="h-16 border-b" />
      <div className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

/** Signed-in layout. Redirects to /login when there is no valid session. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isClient = useIsClient();
  const hasToken = useHasToken();
  const me = useMe();
  const [menuOpen, setMenuOpen] = useState(false);
  const live = useLiveUpdates(me.data);

  const signedOut = isClient && (!hasToken || me.isError);
  useEffect(() => {
    if (signedOut) router.replace("/login");
  }, [signedOut, router]);

  const user = me.data;
  if (!user) return <ShellSkeleton />;

  return (
    <div className="flex flex-1 flex-col bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <MenuIcon />
                </Button>
              }
            />
            <SheetContent side="left" className="w-72 p-4">
              <SheetHeader className="p-0">
                <SheetTitle>
                  <Brand />
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-2 flex flex-col gap-1">
                <NavLinks user={user} onNavigate={() => setMenuOpen(false)} />
              </nav>
            </SheetContent>
          </Sheet>

          <Link href="/requests" className="mr-4">
            <Brand />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <NavLinks user={user} />
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <ConnectionNotice state={live} />
            <UserMenu user={user} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 space-y-6 p-4 sm:p-6">{children}</main>
    </div>
  );
}
