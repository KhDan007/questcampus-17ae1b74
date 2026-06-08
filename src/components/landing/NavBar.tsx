"use client";

import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ONBOARDING_PATH, SIGNIN_PATH } from "@/lib/routes";
import { useAuth } from "@/lib/auth/useAuth";
import { auth, type AuthUser } from "@/lib/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Sparkles, UserRound } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function NavBar({ variant = "landing" }: { variant?: "landing" | "minimal" }) {
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      style={{
        height: 64,
        background: scrolled ? "#FFF8F0" : "transparent",
        borderBottom: scrolled ? "2px solid #111111" : "2px solid transparent",
        transition: "background 120ms ease-out, border-color 120ms ease-out",
      }}
    >
      <nav className="mx-auto flex h-full max-w-(--container-content) items-center justify-between px-4 sm:px-8">
        <Link
          to="/"
          className="font-display tracking-tight"
          style={{ fontWeight: 700, fontSize: 20, color: "#111111", letterSpacing: "-0.01em" }}
        >
          QUESTCAMPUS
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher compact />
          {isAuthenticated && user ? (
            <UserMenu user={user} />
          ) : variant === "landing" ? (
            <>
              <Link
                to={SIGNIN_PATH}
                className="hidden sm:inline text-ink font-body"
                style={{ fontWeight: 500, fontSize: 14 }}
              >
                {t("nav.signin")}
              </Link>
              <Link to={ONBOARDING_PATH} className="bc-btn" style={{ height: 44, fontSize: 14 }}>
                {t("nav.getStarted")} →
              </Link>
            </>
          ) : (
            <Link
              to={SIGNIN_PATH}
              className="text-ink font-body"
              style={{ fontWeight: 500, fontSize: 14 }}
            >
              {t("nav.signin")}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

function initialsOf(user: AuthUser): string {
  const name = (user.name ?? "").trim();
  if (name) {
    const parts = name.split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || (parts[0]?.[0] ?? "").toUpperCase();
  }
  return (user.email[0] ?? "?").toUpperCase();
}

function UserMenu({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("nav.menu.account")}
          className="outline-none focus-visible:ring-2 focus-visible:ring-ink"
          style={{ border: "2px solid #111111", background: "#FFCF00", width: 36, height: 36 }}
        >
          <Avatar className="h-full w-full rounded-none">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name ?? user.email} />}
            <AvatarFallback className="rounded-none bg-bc-yellow text-ink" style={{ fontWeight: 700 }}>
              {initialsOf(user)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-64 p-0 text-ink"
        style={{
          background: "#FFFFFF",
          border: "2px solid #111111",
          borderRadius: 0,
          boxShadow: "4px 4px 0 #111111",
        }}
      >
        <DropdownMenuLabel className="flex items-center gap-3 px-3 py-3" style={{ borderBottom: "2px solid #111111" }}>
          <Avatar className="h-10 w-10 rounded-none" style={{ border: "2px solid #111111" }}>
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name ?? user.email} />}
            <AvatarFallback className="rounded-none bg-bc-yellow text-ink" style={{ fontWeight: 700 }}>
              {initialsOf(user)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display" style={{ fontWeight: 700, fontSize: 14 }}>{user.name ?? "Account"}</p>
            <p className="truncate text-ink-muted" style={{ fontSize: 12 }}>{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={() => navigate({ to: "/profile" })}
          className="cursor-pointer rounded-none px-3 py-2.5 focus:bg-bc-yellow"
        >
          <UserRound className="h-4 w-4" /> {t("nav.menu.profile")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => navigate({ to: "/onboarding" })}
          className="cursor-pointer rounded-none px-3 py-2.5 focus:bg-bc-yellow"
        >
          <Sparkles className="h-4 w-4" /> {t("nav.menu.onboarding")}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-0" style={{ background: "#111111", height: 2 }} />
        <DropdownMenuItem
          onSelect={() => {
            auth.signOut();
            window.location.href = "/";
          }}
          className="cursor-pointer rounded-none px-3 py-2.5 text-bc-red focus:bg-bc-red focus:text-white"
        >
          <LogOut className="h-4 w-4" /> {t("nav.menu.signout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
