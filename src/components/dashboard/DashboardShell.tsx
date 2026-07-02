"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, useReducedMotion, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useQuery } from "convex/react";
import {
  GraduationCap,
  PenLine,
  Activity,
  CalendarClock,
  Send,
  Settings as SettingsIcon,
  Sparkles,
  Crown,
  Lock,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  X,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { WaitlistPopup } from "@/components/landing2/WaitlistPopup";
import { PlanDialog } from "@/components/dashboard/PlanDialog";
import { useAuth } from "@/lib/auth/useAuth";
import { auth } from "@/lib/auth/client";

type Item =
  | {
      kind: "link";
      key: string;
      label: string;
      to: string;
      icon: React.ComponentType<{ className?: string }>;
      match?: (path: string) => boolean;
    }
  | {
      kind: "waitlist";
      key: string;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      feature: string;
    };

const TOP_ITEMS: Item[] = [
  {
    kind: "link",
    key: "autoapply",
    label: "Applications",
    to: "/apply",
    icon: Send,
    match: (p) => p.startsWith("/apply") || p.startsWith("/application"),
  },
  {
    kind: "link",
    key: "universities",
    label: "Universities",
    to: "/universities",
    icon: GraduationCap,
    match: (p) => p.startsWith("/universities"),
  },
  {
    kind: "link",
    key: "essays",
    label: "Essays",
    to: "/essay",
    icon: PenLine,
    match: (p) => p.startsWith("/essay"),
  },
  {
    kind: "waitlist",
    key: "activities",
    label: "Activities",
    icon: Activity,
    feature: "Activities",
  },
  {
    kind: "waitlist",
    key: "deadlines",
    label: "Deadlines",
    icon: CalendarClock,
    feature: "Deadline tracker",
  },
];

const MIN_W = 200;
const MAX_W = 380;
const DEFAULT_W = 260;
const COLLAPSED_W = 72;
const LS_WIDTH = "qc:sidebar:width";
const LS_COLLAPSED = "qc:sidebar:collapsed";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, hasPaidAccess } = useAuth();
  const [waitlist, setWaitlist] = useState<string | null>(null);
  const [planOpen, setPlanOpen] = useState(false);

  const [width, setWidth] = useState<number>(DEFAULT_W);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const w = Number(localStorage.getItem(LS_WIDTH));
      if (w && w >= MIN_W && w <= MAX_W) setWidth(w);
      setCollapsed(localStorage.getItem(LS_COLLAPSED) === "1");
    } catch {}
  }, []);

  // Persist
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(LS_WIDTH, String(width));
    } catch {}
  }, [width, mounted]);
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(LS_COLLAPSED, collapsed ? "1" : "0");
    } catch {}
  }, [collapsed, mounted]);

  // Close mobile drawer on route change
  useEffect(() => setMobileOpen(false), [pathname]);

  // Lock body scroll when mobile drawer open
  useEffect(() => {
    if (typeof document === "undefined" || !mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // ESC handlers
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
      // Cmd/Ctrl + B to toggle collapsed
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Drag-to-resize
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (collapsed) return;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      dragRef.current = { startX: e.clientX, startW: width };
      setIsDragging(true);
    },
    [collapsed, width],
  );
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const next = Math.min(
      MAX_W,
      Math.max(MIN_W, dragRef.current.startW + (e.clientX - dragRef.current.startX)),
    );
    setWidth(next);
  }, []);
  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsDragging(false);
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }, []);

  // Live paid sync
  const token = auth.getSession()?.token;
  const entitlement = useQuery(
    api.payments.entitlement,
    token ? { token } : "skip",
  ) as { paid: boolean } | undefined;
  const livePaid = entitlement?.paid === true;
  useEffect(() => {
    if (livePaid && !hasPaidAccess && user) {
      auth.updateUser({ ...user, paid: true });
    }
  }, [livePaid, hasPaidAccess, user]);

  const effectiveWidth = collapsed ? COLLAPSED_W : width;

  return (
    <>
      <div className="relative flex min-h-screen w-full items-start">
        {/* Desktop sidebar */}
        <aside
          aria-label="Primary"
          className={`sticky top-16 z-40 hidden shrink-0 flex-col self-start border-r-2 border-on-surface/15 bg-surface/95 backdrop-blur-xl lg:flex ${
            isDragging ? "" : "transition-[width] duration-200 ease-out"
          }`}
          style={{ width: effectiveWidth, height: "calc(100vh - 4rem)" }}
        >
          <SidebarBody
            pathname={pathname}
            onWaitlist={(f) => setWaitlist(f)}
            hasPaidAccess={hasPaidAccess}
            collapsed={collapsed}
            onToggleCollapsed={() => setCollapsed((c) => !c)}
            onOpenPlan={() => setPlanOpen(true)}
          />

          {/* Resize handle */}
          {!collapsed && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize sidebar"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onDoubleClick={() => setWidth(DEFAULT_W)}
              className={`absolute right-0 top-0 z-50 h-full w-1.5 -translate-x-1/2 cursor-col-resize touch-none select-none ${
                isDragging ? "bg-primary/60" : "bg-transparent hover:bg-primary/30"
              } transition-colors`}
            />
          )}
        </aside>

        <div className="w-full min-w-0">{children}</div>
      </div>

      {/* Mobile open button (FAB) */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="fixed bottom-5 left-5 z-40 grid h-12 w-12 place-items-center rounded-full border-2 border-on-surface bg-primary text-white qc-hard-shadow-sm active:translate-y-0.5 active:translate-x-0.5 active:shadow-none lg:hidden"
      >
        <PanelLeft className="h-5 w-5" />
      </button>

      {/* Mobile drawer */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {mobileOpen && (
              <div className="fixed inset-0 z-[9999] lg:hidden" role="dialog" aria-modal="true">
                <motion.button
                  type="button"
                  aria-label="Close menu"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  className="absolute inset-0 h-full w-full bg-black/50"
                  onClick={() => setMobileOpen(false)}
                />
                <motion.aside
                  initial={{ x: -24, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -24, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 flex w-[86vw] max-w-[340px] flex-col overflow-y-auto border-r-2 border-on-surface bg-surface shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b-2 border-on-surface/10 px-4 py-3">
                    <p className="font-display text-label-lg font-bold text-on-surface">Menu</p>
                    <button
                      type="button"
                      onClick={() => setMobileOpen(false)}
                      aria-label="Close menu"
                      className="grid h-9 w-9 place-items-center rounded-md border-2 border-on-surface bg-surface text-on-surface qc-hard-shadow-sm active:translate-y-0.5 active:translate-x-0.5 active:shadow-none"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <SidebarBody
                    pathname={pathname}
                    onWaitlist={(f) => {
                      setWaitlist(f);
                      setMobileOpen(false);
                    }}
                    hasPaidAccess={hasPaidAccess}
                    collapsed={false}
                    onToggleCollapsed={() => {}}
                    onOpenPlan={() => {
                      setPlanOpen(true);
                      setMobileOpen(false);
                    }}
                    hideCollapseToggle
                  />
                </motion.aside>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      <WaitlistPopup
        open={!!waitlist}
        onClose={() => setWaitlist(null)}
        title={waitlist ? `${waitlist} — coming soon` : "Coming soon"}
        body="Join the waitlist to be first in line and lock in 30% off monthly access."
        feature={waitlist ?? undefined}
      />

      <PlanDialog open={planOpen} onClose={() => setPlanOpen(false)} />
    </>
  );
}

function SidebarBody({
  pathname,
  onWaitlist,
  hasPaidAccess,
  collapsed,
  onToggleCollapsed,
  onOpenPlan,
  hideCollapseToggle,
}: {
  pathname: string;
  onWaitlist: (feature: string) => void;
  hasPaidAccess: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenPlan: () => void;
  hideCollapseToggle?: boolean;
}) {
  const reduce = useReducedMotion();
  const items = useMemo(() => TOP_ITEMS, []);

  return (
    <div className="flex h-full min-h-0 flex-col gap-1 p-3 pt-5">
      {!hideCollapseToggle && (
        <div className={`flex items-center pb-2 ${collapsed ? "justify-center" : "justify-between px-1"}`}>
          {!collapsed && (
            <p className="font-[var(--font-label)] text-label-sm font-bold uppercase tracking-[0.16em] text-on-surface-variant">
              Workspace
            </p>
          )}
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={`${collapsed ? "Expand" : "Collapse"} sidebar (⌘B)`}
            className="grid h-8 w-8 place-items-center rounded-md border-2 border-on-surface/20 bg-surface text-on-surface/70 transition-colors hover:border-on-surface hover:text-on-surface"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      )}

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
        {items.map((it) => {
          const Icon = it.icon;
          if (it.kind === "link") {
            const active = it.match ? it.match(pathname) : pathname === it.to;
            return (
              <Link
                key={it.key}
                to={it.to}
                title={collapsed ? it.label : undefined}
                className={`group flex items-center gap-3 rounded-lg font-[var(--font-label)] text-label-md font-semibold transition-all ${
                  collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
                } ${
                  active
                    ? "border-2 border-on-surface bg-secondary-container text-on-surface qc-hard-shadow-sm"
                    : "border-2 border-transparent text-on-surface/75 hover:bg-on-surface/5 hover:text-on-surface"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{it.label}</span>}
              </Link>
            );
          }
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onWaitlist(it.feature)}
              title={collapsed ? it.label : undefined}
              className={`group flex items-center gap-3 rounded-lg border-2 border-transparent text-left font-[var(--font-label)] text-label-md font-semibold text-on-surface/55 transition-all hover:bg-on-surface/5 hover:text-on-surface ${
                collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{it.label}</span>
                  <Lock className="h-3 w-3 text-on-surface/40 transition-colors group-hover:text-on-surface" />
                </>
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex shrink-0 flex-col gap-2 pt-4">
        {hasPaidAccess ? (
          collapsed ? (
            <button
              type="button"
              onClick={onOpenPlan}
              aria-label="Your plan"
              title="Your plan"
              className="mx-auto grid h-10 w-10 place-items-center rounded-xl border-2 border-on-surface bg-secondary-container/70 text-on-surface transition-all hover:-translate-y-0.5 hover:translate-x-0.5 qc-hard-shadow-sm hover:shadow-none"
            >
              <Crown className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenPlan}
              className="group w-full rounded-xl border-2 border-on-surface bg-secondary-container/70 p-3 text-left transition-all hover:-translate-y-0.5 hover:translate-x-0.5 qc-hard-shadow-sm hover:shadow-none"
            >
              <p className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-sm font-bold uppercase tracking-wider text-on-surface">
                <Crown className="h-3.5 w-3.5" /> Your plan
              </p>
              <p className="mt-1 font-display text-label-lg font-bold text-on-surface">
                Full access unlocked
              </p>
              <p className="mt-0.5 text-label-sm text-on-surface/75">
                Monthly subscription · manage or cancel
              </p>
            </button>
          )
        ) : (
          <Link
            to="/unlock"
            title={collapsed ? "Upgrade — $15/month" : undefined}
            className={`group relative overflow-hidden rounded-xl border-2 border-on-surface bg-primary text-white qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none ${
              collapsed ? "mx-auto grid h-10 w-10 place-items-center" : "p-3"
            }`}
          >
            {!reduce && !collapsed && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ["-120%", "220%"] }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  repeatDelay: 1.2,
                  ease: "easeInOut",
                }}
                style={{ width: "60%" }}
              />
            )}
            {collapsed ? (
              <Sparkles className="h-4 w-4" />
            ) : (
              <>
                <p className="relative inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-sm font-bold uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" /> Upgrade
                </p>
                <p className="relative mt-1 font-display text-label-lg font-bold">
                  Unlock for $15/month
                </p>
                <p className="relative mt-0.5 text-label-sm text-white/85">
                  Monthly subscription. Full matches + polished essays.
                </p>
              </>
            )}
          </Link>
        )}
        <Link
          to="/profile"
          title={collapsed ? "Settings" : undefined}
          className={`flex items-center gap-3 rounded-lg font-[var(--font-label)] text-label-md font-semibold transition-all ${
            collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
          } ${
            pathname.startsWith("/profile")
              ? "border-2 border-on-surface bg-secondary-container text-on-surface qc-hard-shadow-sm"
              : "border-2 border-transparent text-on-surface/75 hover:bg-on-surface/5 hover:text-on-surface"
          }`}
        >
          <SettingsIcon className="h-4 w-4 shrink-0" />
          {!collapsed && "Settings"}
        </Link>
      </div>
    </div>
  );
}
