"use client";

import { useState, useMemo } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useReducedMotion, motion } from "framer-motion";
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
} from "lucide-react";
import { WaitlistPopup } from "@/components/landing2/WaitlistPopup";
import { useAuth } from "@/lib/auth/useAuth";

type Item =
  | { kind: "link"; key: string; label: string; to: string; icon: React.ComponentType<{ className?: string }>; match?: (path: string) => boolean }
  | { kind: "waitlist"; key: string; label: string; icon: React.ComponentType<{ className?: string }>; feature: string };

const TOP_ITEMS: Item[] = [
  { kind: "link", key: "universities", label: "Universities", to: "/universities", icon: GraduationCap, match: (p) => p.startsWith("/universities") },
  { kind: "link", key: "essays", label: "Essays", to: "/essay", icon: PenLine, match: (p) => p.startsWith("/essay") },
  { kind: "waitlist", key: "activities", label: "Activities", icon: Activity, feature: "Activities" },
  { kind: "waitlist", key: "deadlines", label: "Deadlines", icon: CalendarClock, feature: "Deadline tracker" },
  { kind: "waitlist", key: "autoapply", label: "Auto-Apply", icon: Send, feature: "Auto-Apply" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { hasPaidAccess } = useAuth();
  const [waitlist, setWaitlist] = useState<string | null>(null);

  return (
    <>
      <div className="relative flex min-h-screen w-full items-start">
        {/* Desktop sidebar */}
        <aside
          className="sticky top-16 z-40 hidden w-[260px] shrink-0 flex-col self-start border-r-2 border-on-surface/15 bg-surface/95 backdrop-blur-xl lg:flex"
          style={{ height: "calc(100vh - 4rem)" }}
        >
          <SidebarBody
            pathname={pathname}
            onWaitlist={(f) => setWaitlist(f)}
            hasPaidAccess={hasPaidAccess}
          />
        </aside>

        <div className="w-full min-w-0">
          {children}
        </div>
      </div>

      <WaitlistPopup
        open={!!waitlist}
        onClose={() => setWaitlist(null)}
        title={waitlist ? `${waitlist} — coming soon` : "Coming soon"}
        body="Join the waitlist to be first in line and lock in 30% off for life."
        feature={waitlist ?? undefined}
      />
    </>
  );
}


function SidebarBody({
  pathname,
  onWaitlist,
  hasPaidAccess,
}: {
  pathname: string;
  onWaitlist: (feature: string) => void;
  hasPaidAccess: boolean;
}) {
  const reduce = useReducedMotion();
  const items = useMemo(() => TOP_ITEMS, []);

  return (
    <div className="flex h-full min-h-0 flex-col gap-1 p-4 pt-6">
      <p className="px-3 pb-2 font-[var(--font-label)] text-label-sm font-bold uppercase tracking-[0.16em] text-on-surface-variant">
        Workspace
      </p>
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {items.map((it) => {
          const Icon = it.icon;
          if (it.kind === "link") {
            const active = it.match ? it.match(pathname) : pathname === it.to;
            return (
              <Link
                key={it.key}
                to={it.to}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 font-[var(--font-label)] text-label-md font-semibold transition-all ${
                  active
                    ? "border-2 border-on-surface bg-secondary-container text-on-surface qc-hard-shadow-sm"
                    : "border-2 border-transparent text-on-surface/75 hover:bg-on-surface/5 hover:text-on-surface"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{it.label}</span>
              </Link>
            );
          }
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onWaitlist(it.feature)}
              className="group flex items-center gap-3 rounded-lg border-2 border-transparent px-3 py-2.5 text-left font-[var(--font-label)] text-label-md font-semibold text-on-surface/55 transition-all hover:bg-on-surface/5 hover:text-on-surface"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{it.label}</span>
              <Lock className="h-3 w-3 text-on-surface/40 transition-colors group-hover:text-on-surface" />
            </button>
          );
        })}
      </nav>

      <div className="flex shrink-0 flex-col gap-2 pt-4">
        {hasPaidAccess ? (
          <div className="rounded-xl border-2 border-on-surface bg-secondary-container/70 p-3">
            <p className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-sm font-bold uppercase tracking-wider text-on-surface">
              <Crown className="h-3.5 w-3.5" /> Your plan
            </p>
            <p className="mt-1 font-display text-label-lg font-bold text-on-surface">
              Full access unlocked
            </p>
            <p className="mt-0.5 text-label-sm text-on-surface/75">
              One-time payment. All current features unlocked.
            </p>
          </div>
        ) : (
          <Link
            to="/unlock"
            className="group relative overflow-hidden rounded-xl border-2 border-on-surface bg-primary p-3 text-white qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            {!reduce && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ["-120%", "220%"] }}
                transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
                style={{ width: "60%" }}
              />
            )}
            <p className="relative inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-sm font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> Upgrade
            </p>
            <p className="relative mt-1 font-display text-label-lg font-bold">
              Unlock — $15/month
            </p>
            <p className="relative mt-0.5 text-label-sm text-white/85">
              All matches + polished essays. Cancel anytime.
            </p>
          </Link>
        )}
        <Link
          to="/profile"
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-[var(--font-label)] text-label-md font-semibold transition-all ${
            pathname.startsWith("/profile")
              ? "border-2 border-on-surface bg-secondary-container text-on-surface qc-hard-shadow-sm"
              : "border-2 border-transparent text-on-surface/75 hover:bg-on-surface/5 hover:text-on-surface"
          }`}
        >
          <SettingsIcon className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </div>
  );
}
