"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import logoAsset from "@/assets/questcampus-logo.png.asset.json";
import { ProfileMenu } from "./ProfileMenu";
import { WaitlistPopup } from "./WaitlistPopup";
import { useAuth } from "@/lib/auth/useAuth";

export function NavV2() {
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [popup, setPopup] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLanding = pathname === "/" || pathname === "";
  const isUnlock = pathname.startsWith("/unlock");
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function joinWaitlist(e: React.MouseEvent) {
    if (isLanding) return; // let the anchor scroll naturally on the landing page
    e.preventDefault();
    setPopup(true);
  }

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
        <nav className="mx-auto flex h-16 max-w-(--container-content) items-center justify-between px-5 sm:px-8 lg:px-12">
          <a href="/" className="group flex items-center gap-2.5">
            <img src={logoAsset.url} alt="QuestCampus" className="h-8 w-8" />
            <span className="font-display text-lg font-bold tracking-tight text-on-surface">
              QuestCampus
            </span>
          </a>

          <div className="hidden items-center gap-7 md:flex">
            {isLanding ? (
              <>
                <NavLink href="/#how">How it works</NavLink>
                <NavLink href="/#roadmap">What's coming</NavLink>
                <NavLink href="/#waitlist" onClick={joinWaitlist}>
                  Waitlist
                </NavLink>
              </>
            ) : isAuthenticated ? (
              <NavLink href="/dashboard">Dashboard</NavLink>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {isLanding && (
              <a
                href="/#waitlist"
                onClick={joinWaitlist}
                className="group inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-secondary-container px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface transition-all hover:-translate-y-0.5 hover:translate-x-0.5 qc-hard-shadow-sm hover:shadow-none"
              >
                Join waitlist
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            )}
            <ProfileMenu />
          </div>
        </nav>
      </motion.header>

      <WaitlistPopup open={popup} onClose={() => setPopup(false)} />
    </>
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
