"use client";

import { useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Scale on hover (closer-to-screen feel) */
  hoverScale?: number;
};

/**
 * Cursor-reactive inner glow card.
 * - No 3D tilt
 * - Spotlight glow follows the cursor inside the card
 * - Subtle continuous "breathing" forward motion + hover lift make it feel closer
 * - Honors prefers-reduced-motion
 */
export function TiltCard({
  children,
  className,
  hoverScale = 1.04,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [hovering, setHovering] = useState(false);

  // Cursor position in % within the card
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const sx = useSpring(mx, { stiffness: 180, damping: 24, mass: 0.4 });
  const sy = useSpring(my, { stiffness: 180, damping: 24, mass: 0.4 });

  const spotlight = useTransform(
    [sx, sy],
    (latest) => {
      const [x, y] = latest as number[];
      return `radial-gradient(360px circle at ${x}% ${y}%, rgba(255,255,255,0.55), transparent 60%)`;
    },
  );

  const innerGlow = useTransform(
    [sx, sy],
    (latest) => {
      const [x, y] = latest as number[];
      return `radial-gradient(520px circle at ${x}% ${y}%, hsl(var(--primary) / 0.28), transparent 65%)`;
    },
  );

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 100);
    my.set(((e.clientY - r.top) / r.height) * 100);
  }
  function onEnter() {
    if (!reduce) setHovering(true);
  }
  function onLeave() {
    setHovering(false);
    mx.set(50);
    my.set(50);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      animate={
        reduce
          ? undefined
          : hovering
            ? { scale: hoverScale, y: -6 }
            : { scale: [1, 1.012, 1], y: [0, -2, 0] }
      }
      transition={
        reduce
          ? undefined
          : hovering
            ? { type: "spring", stiffness: 220, damping: 20, mass: 0.6 }
            : {
                duration: 4.2,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "loop",
              }
      }
      style={{ willChange: "transform" }}
      className={className}
    >
      {!reduce && (
        <>
          {/* Inner primary glow following cursor */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{ background: innerGlow }}
          />
          {/* Bright spotlight overlay */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light"
            style={{ background: spotlight, opacity: hovering ? 1 : 0.7 }}
          />
          {/* Hover ring accent */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/15"
            animate={{ opacity: hovering ? 1 : 0 }}
            transition={{ duration: 0.25 }}
          />
        </>
      )}
      <div className="relative">{children}</div>
    </motion.div>
  );
}
