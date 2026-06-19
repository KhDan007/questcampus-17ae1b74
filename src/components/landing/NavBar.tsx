"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { CTAButton } from "./CTAButton";
import { ONBOARDING_PATH, SIGNIN_PATH } from "@/lib/routes";
import logoAsset from "@/assets/questcampus-logo-full.png.asset.json";
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
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Sparkles, UserRound } from "lucide-react";

import { useI18n } from "@/lib/i18n/I18nProvider";

export function NavBar({ variant = "landing" }: { variant?: "landing" | "minimal" }) {
  const reduce = useReducedMotion();
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
    <motion.header
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`fixed inset-x-0 top-0 z-50 border-b bg-surface-container-low/80 backdrop-blur-md transition-shadow duration-300 ${
        scrolled
          ? "border-outline-variant shadow-[0_4px_20px_-8px_rgba(53,37,205,0.18)]"
          : "border-outline-variant/60"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-(--container-content) items-center justify-between px-4 sm:px-8 lg:px-16">
        <a
          href="/"
          className="flex items-center gap-2 font-display text-xl font-bold text-primary tracking-tight"
        >
          <img
            src={logoAsset.url}
            alt="QuestCampus"
            className="h-8 w-auto object-contain"
          />
        </a>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher compact />
          {isAuthenticated && user ? (
            <UserMenu user={user} />
          ) : variant === "landing" ? (
            <>
              <a
                href={SIGNIN_PATH}
                className="hidden text-label-md text-on-surface-variant transition-colors hover:text-on-surface sm:inline"
              >
                {t("nav.signin")}
              </a>
              <CTAButton href={ONBOARDING_PATH} className="!min-h-11 !px-5 text-label-md">
                {t("nav.getStarted")}
              </CTAButton>
            </>
          ) : (
            <a
              href={SIGNIN_PATH}
              className="text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
            >
              {t("nav.signin")}
            </a>
          )}
        </div>
      </nav>
    </motion.header>
  );
}

function initialsOf(user: AuthUser): string {
  const name = (user.name ?? "").trim();
  if (name) {
    const parts = name.split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const second = parts[1]?.[0] ?? "";
    return (first + second).toUpperCase() || first.toUpperCase();
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
          className="rounded-full outline-none ring-offset-2 ring-offset-surface-container-low transition-transform hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Avatar className="h-9 w-9 ring-1 ring-outline-variant/60">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name ?? user.email} />}
            <AvatarFallback className="bg-primary-fixed text-label-sm font-semibold text-on-primary-fixed-variant">
              {initialsOf(user)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-64 rounded-none border border-outline-variant/60 bg-surface-container-lowest p-1.5 text-on-surface shadow-[0_16px_40px_-12px_rgba(53,37,205,0.22)]"
      >
        <DropdownMenuLabel className="flex items-center gap-3 px-2.5 py-2.5">
          <Avatar className="h-10 w-10 shrink-0">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name ?? user.email} />}
            <AvatarFallback className="bg-primary-fixed text-label-sm font-semibold text-on-primary-fixed-variant">
              {initialsOf(user)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-label-md font-semibold text-on-surface">
              {user.name ?? "Account"}
            </p>
            <p className="truncate text-label-sm font-normal text-on-surface-variant">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="-mx-1.5 my-1 bg-outline-variant/50" />
        <DropdownMenuItem
          onSelect={() => navigate({ to: "/profile" })}
          className="cursor-pointer rounded-none px-2.5 py-2 text-label-md text-on-surface focus:bg-surface-container-low focus:text-on-surface"
        >
          <UserRound className="h-4 w-4 text-on-surface-variant" />
          {t("nav.menu.profile")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => navigate({ to: "/onboarding" })}
          className="cursor-pointer rounded-none px-2.5 py-2 text-label-md text-on-surface focus:bg-surface-container-low focus:text-on-surface"
        >
          <Sparkles className="h-4 w-4 text-on-surface-variant" />
          {t("nav.menu.onboarding")}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="-mx-1.5 my-1 bg-outline-variant/50" />
        <DropdownMenuItem
          onSelect={() => {
            auth.signOut();
            window.location.href = "/";
          }}
          className="cursor-pointer rounded-none px-2.5 py-2 text-label-md text-error focus:bg-error-container/60 focus:text-on-error-container"
        >
          <LogOut className="h-4 w-4" />
          {t("nav.menu.signout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
