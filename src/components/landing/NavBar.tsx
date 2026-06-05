"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CTAButton } from "./CTAButton";
import { ONBOARDING_PATH, SIGNIN_PATH } from "@/lib/routes";

export function NavBar() {
  const reduce = useReducedMotion();
  // Glass bar is always visible (incl. on load). After 60px scroll we deepen
  // the blur/shadow slightly so the bar still reads as it overlaps content.
  const [scrolled, setScrolled] = useState(false);

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
        <Link
          to="/"
          className="font-display text-xl font-bold text-primary tracking-tight"
        >
          QuestCampus
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
          <Link
            to={SIGNIN_PATH}
            className="hidden text-label-md text-on-surface-variant transition-colors hover:text-on-surface sm:inline"
          >
            Sign in
          </Link>
          <CTAButton to={ONBOARDING_PATH} className="!min-h-11 !px-5 text-label-md">
            Get started →
          </CTAButton>
        </div>
      </nav>
    </motion.header>
  );
}
