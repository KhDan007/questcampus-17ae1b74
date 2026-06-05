"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { CTAButton } from "./CTAButton";
import { ONBOARDING_PATH, SIGNIN_PATH } from "@/lib/routes";
import logoAsset from "@/assets/questcampus-logo.png.asset.json";

export function NavBar({ variant = "landing" }: { variant?: "landing" | "minimal" }) {
  const reduce = useReducedMotion();
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
              <a
                href={SIGNIN_PATH}
                className="hidden text-label-md text-on-surface-variant transition-colors hover:text-on-surface sm:inline"
              >
                Sign in
              </a>
              <CTAButton href={ONBOARDING_PATH} className="!min-h-11 !px-5 text-label-md">
                Get started →
              </CTAButton>
            </>
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
