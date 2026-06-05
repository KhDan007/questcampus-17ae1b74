"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

// Word with an amber underline that draws itself in when scrolled into view.
export function AmberUnderline({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-block whitespace-nowrap">
      {children}
      <motion.span
        aria-hidden
        className="absolute -bottom-1 left-0 right-0 h-[3px] origin-left rounded-full bg-secondary-container"
        initial={reduce ? false : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
      />
    </span>
  );
}
