"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { CTAButton } from "./CTAButton";
import { ONBOARDING_PATH, SIGNIN_PATH } from "@/lib/routes";
import logoAsset from "@/assets/questcampus-logo.png.asset.json";
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

export function NavBar({ variant = "landing" }: { variant?: "landing" | "minimal" }) {
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated } = useAuth();

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
            alt="QuestCampus logo"
            className="h-8 w-8 object-contain"
          />
          QuestCampus
        </a>

        <div className="flex items-center gap-3 sm:gap-5">
          {variant === "landing" ? (
            <>
              {!isAuthenticated && (
                <a
                  href={SIGNIN_PATH}
                  className="hidden text-label-md text-on-surface-variant transition-colors hover:text-on-surface sm:inline"
                >
                  Sign in
                </a>
              )}
              <CTAButton href={ONBOARDING_PATH} className="!min-h-11 !px-5 text-label-md">
                Get started →
              </CTAButton>
              {isAuthenticated && user && <UserMenu user={user} />}
            </>
          ) : isAuthenticated && user ? (
            <UserMenu user={user} />
          ) : (
            <a
              href={SIGNIN_PATH}
              className="text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
            >
              Sign in
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="rounded-full outline-none ring-offset-2 ring-offset-surface-container-low focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Avatar className="h-9 w-9">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name ?? user.email} />}
            <AvatarFallback className="bg-primary-fixed text-label-sm font-semibold text-primary">
              {initialsOf(user)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-label-md font-semibold text-on-surface">
            {user.name ?? "Account"}
          </span>
          <span className="truncate text-label-sm font-normal text-on-surface-variant">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: "/profile" })}>
          My profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: "/onboarding" })}>
          Continue onboarding
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            auth.signOut();
            window.location.href = "/";
          }}
          className="text-error focus:bg-error-container/40 focus:text-on-error-container"
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
