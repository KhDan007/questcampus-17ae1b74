"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useQuery } from "convex/react";
import {
  GraduationCap,
  Activity,
  CalendarClock,
  BarChart3,
  Send,
  MessageSquare,
  Settings as SettingsIcon,
  Sparkles,
  Crown,
  Lock,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  LayoutDashboard,
  X,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { WaitlistPopup } from "@/components/landing2/WaitlistPopup";
import { PlanDialog } from "@/components/dashboard/PlanDialog";
import { QuestCampusLogo } from "@/components/brand/QuestCampusLogo";
import { useAuth, useFreeHook } from "@/lib/auth/useAuth";

type SidebarUser = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
} | null;
import { auth } from "@/lib/auth/client";
import { WAITLIST_BASE_DISCOUNT } from "@/lib/config";

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

type NavGroup = { key: string; label: string; items: Item[] };

// Grouped navigation. Sectioning turns a flat list of six competing links into
// two scannable clusters — "what am I working toward" vs "the application
// machinery" — so the eye lands on the right group first.
const NAV_GROUPS: NavGroup[] = [
  {
    key: "workspace",
    label: "Workspace",
    items: [
      {
        kind: "link",
        key: "dashboard",
        label: "Dashboard",
        to: "/dashboard",
        icon: LayoutDashboard,
        match: (p) => p === "/dashboard" || p.startsWith("/dashboard"),
      },
      {
        kind: "link",
        key: "agent",
        label: "Agent",
        to: "/agent",
        icon: Sparkles,
        match: (p) => p.startsWith("/agent"),
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
        key: "plan",
        label: "Plan",
        to: "/plan",
        icon: CalendarClock,
        match: (p) => p.startsWith("/plan"),
      },
    ],
  },
  {
    key: "applications",
    label: "Applications",
    items: [
      {
        kind: "link",
        key: "autoapply",
        label: "Applications",
        to: "/apply",
        icon: Send,
        match: (p) =>
          (p.startsWith("/apply") && !p.startsWith("/apply/strength")) ||
          p.startsWith("/application"),
      },
      {
        kind: "link",
        key: "strength",
        label: "Strength",
        to: "/apply/strength",
        icon: BarChart3,
        match: (p) => p.startsWith("/apply/strength"),
      },
      {
        kind: "waitlist",
        key: "activities",
        label: "Activities",
        icon: Activity,
        feature: "Activities",
      },
    ],
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
    } catch {
      // localStorage can be unavailable in private browsing.
    }
  }, []);

  // Persist
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(LS_WIDTH, String(width));
    } catch {
      // Persisting sidebar width is non-critical.
    }
  }, [width, mounted]);
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(LS_COLLAPSED, collapsed ? "1" : "0");
    } catch {
      // Persisting sidebar state is non-critical.
    }
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
      <div className="relative flex min-h-screen w-full max-w-full items-start overflow-x-clip bg-surface-container">
        {/* Desktop sidebar */}
        <aside
          aria-label="Primary"
          className={`sticky top-16 z-40 hidden shrink-0 flex-col self-start border-r border-on-surface/8 bg-surface lg:flex ${
            isDragging ? "" : "transition-[width] duration-200 ease-out"
          }`}
          style={{ width: effectiveWidth, height: "calc(100vh - 4rem)" }}
        >
          <SidebarBody
            pathname={pathname}
            user={user}
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

        <div className="w-full min-w-0 lg:-ml-5">{children}</div>
      </div>

      {/* Mobile open button (FAB) */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open workspace menu"
        title="Open workspace menu"
        className="fixed bottom-5 left-5 z-[60] grid h-12 w-12 place-items-center rounded-full border-2 border-on-surface bg-primary text-white qc-hard-shadow-sm active:translate-y-0.5 active:translate-x-0.5 active:shadow-none lg:hidden"
      >
        <PanelLeft className="h-5 w-5" />
      </button>

      {/* Mobile drawer */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {mobileOpen && (
              <div className="fixed inset-0 z-[9999] lg:hidden" role="dialog" aria-modal="true" aria-label="Workspace menu">
                {/* Plain elements, no JS-driven entry animation: framer's rAF
                    animation can freeze at its initial frame on throttled
                    mobile browsers, leaving the drawer shifted or invisible. */}
                <button
                  type="button"
                  aria-label="Close workspace menu"
                  className="absolute inset-0 h-full w-full bg-black/50"
                  onClick={() => setMobileOpen(false)}
                />
                <aside className="absolute left-0 top-0 flex h-dvh w-[86vw] max-w-[340px] flex-col overflow-y-auto border-r border-on-surface/10 bg-surface pb-[env(safe-area-inset-bottom)] shadow-2xl">
                  <div className="flex items-center justify-between border-b border-on-surface/10 px-4 py-3">
                    <QuestCampusLogo className="h-7" />
                    <button
                      type="button"
                      onClick={() => setMobileOpen(false)}
                      aria-label="Close workspace menu"
                      className="grid h-9 w-9 place-items-center rounded-md border border-on-surface/15 bg-surface text-on-surface/70 transition-colors hover:text-on-surface active:scale-95"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <SidebarBody
                    pathname={pathname}
                    user={user}
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
                </aside>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      <WaitlistPopup
        open={!!waitlist}
        onClose={() => setWaitlist(null)}
        title={waitlist ? `${waitlist} — coming soon` : "Coming soon"}
        body={`Join the waitlist to be first in line and lock in ${WAITLIST_BASE_DISCOUNT}% off monthly access.`}
        feature={waitlist ?? undefined}
      />

      <PlanDialog open={planOpen} onClose={() => setPlanOpen(false)} />
    </>
  );
}

function SidebarBody({
  pathname,
  user,
  onWaitlist,
  hasPaidAccess,
  collapsed,
  onToggleCollapsed,
  onOpenPlan,
  hideCollapseToggle,
}: {
  pathname: string;
  user: SidebarUser;
  onWaitlist: (feature: string) => void;
  hasPaidAccess: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenPlan: () => void;
  hideCollapseToggle?: boolean;
}) {
  const freeHook = useFreeHook();

  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      {!hideCollapseToggle && (
        <div className={`flex items-center pb-1 ${collapsed ? "justify-center" : "justify-end px-1"}`}>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={`${collapsed ? "Expand" : "Collapse"} sidebar (⌘B)`}
            className="grid h-8 w-8 place-items-center rounded-md text-on-surface/50 transition-colors hover:bg-on-surface/5 hover:text-on-surface"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      )}

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_GROUPS.map((group) => (
          <div key={group.key} className="mb-1">
            {!collapsed && (
              <p className="px-3 pb-1 pt-3 font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-[0.12em] text-on-surface-variant/70">
                {group.label}
              </p>
            )}
            {collapsed && group.key !== NAV_GROUPS[0].key && (
              <div className="mx-auto my-2 h-px w-6 bg-on-surface/10" />
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((it) => (
                <NavRow
                  key={it.key}
                  item={it}
                  pathname={pathname}
                  collapsed={collapsed}
                  onWaitlist={onWaitlist}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex shrink-0 flex-col gap-1 pt-3">
        {hasPaidAccess ? (
          collapsed ? (
            <button
              type="button"
              onClick={onOpenPlan}
              aria-label="Your plan"
              title="Your plan"
              className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-secondary-fixed text-on-secondary-fixed-variant transition-colors hover:bg-secondary-fixed-dim"
            >
              <Crown className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenPlan}
              className="group w-full rounded-xl border border-on-surface/10 bg-secondary-fixed/50 p-3 text-left transition-colors hover:bg-secondary-fixed/70"
            >
              <p className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-secondary-fixed-variant">
                <Crown className="h-3.5 w-3.5" /> Full access
              </p>
              <p className="mt-0.5 text-label-sm text-on-surface/65">
                Manage your subscription
              </p>
            </button>
          )
        ) : (
          <Link
            to="/unlock"
            title={collapsed ? (freeHook ? "Start free trial — $15/mo after" : "Upgrade — $15/month") : undefined}
            className={`group rounded-xl bg-primary text-white transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 qc-hard-shadow-sm hover:shadow-none ${
              collapsed ? "mx-auto grid h-10 w-10 place-items-center" : "block p-3"
            }`}
          >
            {collapsed ? (
              <Sparkles className="h-4 w-4" />
            ) : (
              <>
                <p className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-sm font-bold">
                  <Sparkles className="h-3.5 w-3.5" /> {freeHook ? "Start free trial" : "Upgrade"}
                </p>
                <p className="mt-0.5 text-label-sm text-white/85">
                  {freeHook ? "$0 today · $15/mo after" : "$15/month · full access"}
                </p>
              </>
            )}
          </Link>
        )}

        <NavRow
          item={{ kind: "link", key: "feedback", label: "Send feedback", to: "/feedback", icon: MessageSquare, match: (p) => p.startsWith("/feedback") }}
          pathname={pathname}
          collapsed={collapsed}
          onWaitlist={onWaitlist}
        />

        <div className="my-1 h-px bg-on-surface/8" />

        <Link
          to="/profile"
          title={collapsed ? user?.name || user?.email || "Account" : undefined}
          aria-label="Account settings"
          className={`flex items-center gap-3 rounded-lg transition-colors hover:bg-on-surface/5 ${
            collapsed ? "justify-center p-1.5" : "px-2 py-2"
          } ${pathname.startsWith("/profile") ? "bg-on-surface/5" : ""}`}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-fixed text-on-primary-fixed-variant">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-[var(--font-label)] text-label-sm font-bold">
                {sidebarInitials(user)}
              </span>
            )}
          </span>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-[var(--font-label)] text-label-md font-semibold text-on-surface">
                  {user?.name || "Your account"}
                </span>
                <span className="block truncate text-label-sm text-on-surface-variant">
                  {user?.email || "Settings"}
                </span>
              </span>
              <SettingsIcon className="h-4 w-4 shrink-0 text-on-surface/40" />
            </>
          )}
        </Link>
      </div>
    </div>
  );
}

function sidebarInitials(user: SidebarUser): string {
  const source = (user?.name || user?.email || "").trim();
  if (!source) return "?";
  return (
    source
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

// One navigation row, shared by both nav groups and the bottom utilities so the
// active/hover vocabulary is identical everywhere. Active = soft coral-tint
// wash + coral text (no border, no hard shadow); inactive = muted, quiet hover.
function NavRow({
  item,
  pathname,
  collapsed,
  onWaitlist,
}: {
  item: Item;
  pathname: string;
  collapsed: boolean;
  onWaitlist: (feature: string) => void;
}) {
  const Icon = item.icon;
  const base = `group flex items-center gap-3 font-[var(--font-label)] text-label-md font-semibold transition-colors ${
    collapsed ? "mx-auto h-10 w-10 justify-center rounded-xl" : "rounded-lg px-3 py-2"
  }`;

  if (item.kind === "waitlist") {
    return (
      <button
        type="button"
        onClick={() => onWaitlist(item.feature)}
        title={collapsed ? item.label : undefined}
        aria-label={collapsed ? item.label : undefined}
        className={`${base} text-on-surface-variant/70 hover:bg-on-surface/5 hover:text-on-surface`}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{item.label}</span>
            <Lock className="h-3.5 w-3.5 text-on-surface/35" />
          </>
        )}
      </button>
    );
  }

  const active = item.match ? item.match(pathname) : pathname === item.to;
  return (
    <Link
      to={item.to}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={`${base} ${
        active
          ? "bg-primary-fixed/70 text-primary"
          : "text-on-surface-variant hover:bg-on-surface/5 hover:text-on-surface"
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}
