"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Stagger delay in seconds (derive from index: index * 0.12). */
  delay?: number;
  /** Travel distance in px before settling. */
  y?: number;
  duration?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
  /** Run immediately on mount (hero) instead of waiting for viewport. */
  onMount?: boolean;
  /** Add a subtle scale pop (e.g. featured pricing card). */
  scaleFrom?: number;
};

// Thin client wrapper so section copy can stay in Server Components —
// only the motion boundary is shipped to the client.
export function Reveal({
  children,
  delay = 0,
  y = 30,
  duration = 0.5,
  className,
  as = "div",
  onMount = false,
  scaleFrom,
}: RevealProps) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as];

  // prefers-reduced-motion → render at final values, no animation.
  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const hidden: Variants["hidden"] = {
    opacity: 0,
    y,
    ...(scaleFrom != null ? { scale: scaleFrom } : {}),
  };
  const shown = {
    opacity: 1,
    y: 0,
    ...(scaleFrom != null ? { scale: 1 } : {}),
  };

  const animateProps = onMount
    ? { animate: shown }
    : { whileInView: shown, viewport: { once: true, amount: 0.2 } };

  return (
    <MotionTag
      className={className}
      initial={hidden}
      {...animateProps}
      transition={{ duration, ease: "easeOut", delay }}
    >
      {children}
    </MotionTag>
  );
}
