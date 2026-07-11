"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LogIn, UserPlus, User as UserIcon, LogOut, LayoutDashboard, Sparkles } from "lucide-react";
import { useAuth, useFreeHook } from "@/lib/auth/useAuth";
import { auth } from "@/lib/auth/client";

export function ProfileMenu() {
  const reduce = useReducedMotion();
  const { user, isAuthenticated } = useAuth();
  const freeHook = useFreeHook();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Anchor position for the portaled menu (fixed, relative to the viewport).
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 72, right: 16 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // The dropdown is PORTALED to <body> (not nested in the header) so it can
  // stack above the assistant panel (z-80) instead of being trapped under it by
  // the header's own z-50 stacking context. Anchor it to the avatar button.
  useEffect(() => {
    if (!open) return;
    const updatePos = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    };
    updatePos();
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!wrapRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  const initials =
    (user?.name || user?.email || "?")
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  const menu = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          role="menu"
          style={{ top: pos.top, right: pos.right }}
          initial={reduce ? false : { opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="fixed z-[90] w-64 origin-top-right overflow-hidden rounded-2xl border border-on-surface/10 bg-surface-container-lowest qc-soft-shadow"
        >
          {isAuthenticated ? (
            <div className="p-2">
              <div className="px-3 py-2.5">
                <p className="truncate font-[var(--font-label)] text-label-md font-semibold text-on-surface">
                  {user?.name || "Welcome back"}
                </p>
                <p className="truncate text-body-sm text-on-surface-variant">
                  {user?.email}
                </p>
              </div>
              <div className="my-1 h-px bg-on-surface/10" />
              {freeHook && (
                <MenuLink href="/unlock" icon={<Sparkles className="h-4 w-4" />} primary>
                  Start free trial · $0
                </MenuLink>
              )}
              <MenuLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>
                Dashboard
              </MenuLink>
              <MenuLink href="/profile" icon={<UserIcon className="h-4 w-4" />}>
                My profile
              </MenuLink>
              <button
                type="button"
                onClick={() => {
                  auth.signOut();
                  setOpen(false);
                  window.location.href = "/";
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left font-[var(--font-label)] text-label-md text-on-surface transition-colors hover:bg-on-surface/5"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          ) : (
            <div className="p-2">
              <div className="px-3 pt-3 pb-2">
                <p className="font-[var(--font-label)] text-label-md font-semibold text-on-surface">
                  Welcome to QuestCampus
                </p>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                  Save your matches across devices.
                </p>
              </div>
              <MenuLink href="/signin" icon={<LogIn className="h-4 w-4" />}>
                Sign in
              </MenuLink>
              <MenuLink
                href="/signin?mode=signup"
                icon={<UserPlus className="h-4 w-4" />}
                primary
              >
                Create free account
              </MenuLink>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-label={isAuthenticated ? "Open account menu" : "Open sign in menu"}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="group relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-on-surface/10 bg-surface text-on-surface transition-colors hover:bg-on-surface/5"
      >
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : isAuthenticated ? (
          <span className="font-[var(--font-label)] text-label-sm font-semibold">
            {initials}
          </span>
        ) : (
          <UserIcon className="h-5 w-5" />
        )}
      </button>

      {mounted ? createPortal(menu, document.body) : null}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  children,
  primary,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 font-[var(--font-label)] text-label-md transition-colors ${
        primary
          ? "bg-primary text-on-primary hover:bg-primary/90"
          : "text-on-surface hover:bg-on-surface/5"
      }`}
    >
      {icon}
      {children}
    </a>
  );
}
