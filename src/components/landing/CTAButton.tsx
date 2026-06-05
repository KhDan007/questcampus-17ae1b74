"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type Variant = "primary" | "ghost" | "amber" | "white";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-body text-label-md " +
  "min-h-[52px] px-7 transition-colors duration-200 select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  // Solid deep indigo → deeper on hover, indigo-tinted lift shadow.
  primary:
    "bg-primary-container text-on-primary hover:bg-primary " +
    "shadow-[0_8px_24px_-6px_rgba(79,70,229,0.45)] hover:shadow-[0_12px_28px_-4px_rgba(53,37,205,0.5)]",
  // Outline / ghost, primary colored.
  ghost:
    "border border-primary text-primary bg-transparent hover:bg-primary-container/10",
  // Waitlist action — amber, visually distinct from onboarding CTA.
  amber:
    "bg-secondary-container text-on-secondary-container hover:brightness-95 " +
    "shadow-[0_8px_24px_-6px_rgba(254,166,25,0.45)]",
  // On dark / gradient backgrounds.
  white:
    "bg-white text-primary hover:bg-white/90 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.25)]",
};

type Props = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
  ariaLabel?: string;
  /** Stronger hover lift for hero/final CTAs. */
  hoverScale?: number;
};

export function CTAButton({
  href,
  children,
  variant = "primary",
  className = "",
  ariaLabel,
  hoverScale = 1,
}: Props) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="inline-block"
      whileTap={reduce ? undefined : { scale: 0.97 }}
      whileHover={reduce || hoverScale === 1 ? undefined : { scale: hoverScale }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <Link
        to={href}
        aria-label={ariaLabel}
        className={`${base} ${variants[variant]} ${className}`}
      >
        {children}
      </Link>
    </motion.div>
  );
}
