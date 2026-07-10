"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Menu, X, GraduationCap, PenLine, Settings as SettingsIcon, Home, Sparkles, FileText } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { QuestCampusLogo } from "@/components/brand/QuestCampusLogo";
import { ProfileMenu } from "./ProfileMenu";
import { WaitlistPopup } from "./WaitlistPopup";
import { useAuth, useFreeHook } from "@/lib/auth/useAuth";
import { LanguageSwitcher } from "@/lib/i18n/LanguageSwitcher";


export function NavV2() {
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [popup, setPopup] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLanding = pathname === "/" || pathname === "";
  const isUnlock = pathname.startsWith("/unlock");
  const { isAuthenticated } = useAuth();
  const freeHook = useFreeHook();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close drawer on route change
  useEffect(() => setMobileOpen(false), [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  function joinWaitlist(e: React.MouseEvent) {
    if (isLanding) return; // let the anchor scroll naturally on the landing page
    e.preventDefault();
    setPopup(true);
  }

  const showStartButton = isLanding || isUnlock;
  // Signed-in visitors go straight to the app; signed-out ones to signup.
  const startHref = isAuthenticated ? "/dashboard" : "/signin?mode=signup";
  // Signed-in workspace pages get their nav from DashboardShell's drawer
  // (bottom-left FAB) — the header hamburger there was a redundant second
  // menu. Keep it only where it's the sole navigation: the landing page
  // and signed-out visitors.
  const showMobileMenu = isLanding || !isAuthenticated;

  return (
    <>
      <motion.header
        initial={reduce ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-on-surface/10 bg-surface/70 backdrop-blur-xl"
            : "bg-transparent"
        }`}
      >
        <nav className="flex h-16 w-full items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <a href="/" className="group flex items-center">
              <QuestCampusLogo className="h-8" />
            </a>
          </div>

          <div className="hidden items-center gap-7 md:flex">
            {isLanding ? (
              <>
                <NavLink href="/#how">How it works</NavLink>
                <NavLink href="/#roadmap">What's coming</NavLink>
                <NavLink href="/#waitlist" onClick={joinWaitlist}>
                  Waitlist
                </NavLink>
              </>
            ) : isUnlock ? (
              <NavLink href="/dashboard">Dashboard</NavLink>
            ) : isAuthenticated ? (
              <>
                <NavLink href="/universities">Universities</NavLink>
                <NavLink href="/documents">Documents</NavLink>
                <NavLink href="/dashboard">Dashboard</NavLink>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <LanguageSwitcher compact />
            </div>
            {showStartButton && (
              <a
                href={startHref}
                className="group hidden items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-white transition-all hover:-translate-y-0.5 hover:translate-x-0.5 qc-hard-shadow-sm hover:shadow-none sm:inline-flex"
              >
                {freeHook && (
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-label-sm font-bold leading-none">
                    $0
                  </span>
                )}
                {freeHook ? "Start free" : "Start now"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            )}
            
            {!isUnlock && <ProfileMenu />}
          </div>
        </nav>
      </motion.header>

      {/* Mobile open button (FAB) — same treatment as the workspace drawer's. */}
      {showMobileMenu && (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          title="Open menu"
          className="fixed bottom-5 left-5 z-40 grid h-12 w-12 place-items-center rounded-full border-2 border-on-surface bg-primary text-white qc-hard-shadow-sm active:translate-y-0.5 active:translate-x-0.5 active:shadow-none md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {mounted && createPortal(
        <AnimatePresence>
          {mobileOpen && showMobileMenu && (
            <div className="fixed inset-0 z-[9999] md:hidden" role="dialog" aria-modal="true">
              {/* Plain elements, no JS-driven entry animation: framer's rAF
                  animation can freeze at its initial frame on throttled
                  mobile browsers, leaving the drawer shifted or invisible. */}
              <button
                type="button"
                aria-label="Close menu"
                className="absolute inset-0 h-full w-full bg-black/50"
                onClick={() => setMobileOpen(false)}
              />
              <aside className="absolute left-0 top-0 flex h-dvh w-[84vw] max-w-[320px] flex-col overflow-y-auto border-r-2 border-on-surface bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <Link to="/" className="flex items-center" onClick={() => setMobileOpen(false)}>
                    <QuestCampusLogo className="h-7" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close menu"
                    className="grid h-10 w-10 place-items-center rounded-md border-2 border-on-surface bg-surface text-on-surface qc-hard-shadow-sm active:translate-y-0.5 active:translate-x-0.5 active:shadow-none"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <nav className="flex flex-col gap-1">
                  <div className="px-3 py-2">
                    <LanguageSwitcher />
                  </div>
                  <MobileLink to="/" icon={Home} label="Home" active={isLanding} onClick={() => setMobileOpen(false)} />
                  {isAuthenticated && (
                    <MobileLink to="/agent" icon={Sparkles} label="Agent" active={pathname.startsWith("/agent")} onClick={() => setMobileOpen(false)} />
                  )}
                  <MobileLink to="/universities" icon={GraduationCap} label="Universities" active={pathname.startsWith("/universities")} onClick={() => setMobileOpen(false)} />
                  <MobileLink to="/essay" icon={PenLine} label="Essays" active={pathname.startsWith("/essay")} onClick={() => setMobileOpen(false)} />
                  {isAuthenticated && (
                    <MobileLink to="/documents" icon={FileText} label="Documents" active={pathname.startsWith("/documents")} onClick={() => setMobileOpen(false)} />
                  )}
                  <MobileLink to="/profile" icon={SettingsIcon} label="Settings" active={pathname.startsWith("/profile")} onClick={() => setMobileOpen(false)} />

                  {isLanding && (
                    <>
                      <MobileAnchor href="/#how" label="How it works" onClick={() => setMobileOpen(false)} />
                      <MobileAnchor href="/#roadmap" label="What's coming" onClick={() => setMobileOpen(false)} />
                    </>
                  )}
                </nav>

                <div className="mt-auto pt-6">
                  {showStartButton ? (
                    <a
                      href={startHref}
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-semibold text-white qc-hard-shadow-sm"
                    >
                      {freeHook && (
                        <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-label-sm font-bold leading-none">
                          $0
                        </span>
                      )}
                      {freeHook ? "Start free" : "Start now"} <ArrowRight className="h-4 w-4" />
                    </a>
                  ) : !isAuthenticated ? (
                    <Link
                      to="/signin"
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-semibold text-white qc-hard-shadow-sm"
                    >
                      Sign in <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <Link
                      to="/unlock"
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-semibold text-white qc-hard-shadow-sm"
                    >
                      <Sparkles className="h-4 w-4" />
                      {freeHook ? "Start free trial" : "Unlock for $15"}
                    </Link>
                  )}
                </div>
              </aside>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <WaitlistPopup open={popup} onClose={() => setPopup(false)} />
    </>
  );
}

function MobileLink({
  to,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-3 font-[var(--font-label)] text-label-md font-semibold transition-colors ${
        active
          ? "border-2 border-on-surface bg-secondary-container text-on-surface qc-hard-shadow-sm"
          : "border-2 border-transparent text-on-surface/80 hover:bg-on-surface/5"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function MobileAnchor({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg border-2 border-transparent px-3 py-3 font-[var(--font-label)] text-label-md font-semibold text-on-surface/80 hover:bg-on-surface/5"
    >
      {label}
    </a>
  );
}

function NavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="font-[var(--font-label)] text-label-md text-on-surface/70 transition-colors hover:text-on-surface"
    >
      {children}
    </a>
  );
}
