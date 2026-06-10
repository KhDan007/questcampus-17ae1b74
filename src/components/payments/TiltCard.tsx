"use client";

import { useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionStyle,
} from "framer-motion";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Max tilt in degrees */
  maxTilt?: number;
  /** Scale on hover (closer-to-screen feel) */
  hoverScale?: number;
};

/**
 * Cursor-reactive 3D tilt with parallax glow + spotlight.
 * - Tilts on pointer move
 * - Lifts/scales on hover (feels closer)
 * - Spring-smoothed for fluid motion
 * - Honors prefers-reduced-motion
 */
export function TiltCard({
  children,
  className,
  maxTilt = 12,
  hoverScale = 1.035,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [hovering, setHovering] = useState(false);

  // Normalized pointer position [-0.5, 0.5]
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  const spring = { stiffness: 220, damping: 22, mass: 0.5 };
  const sx = useSpring(px, spring);
  const sy = useSpring(py, spring);

  // Tilt — flipped axes (x pointer -> rotateY, y pointer -> -rotateX)
  const rotateY = useTransform(sx, (v) => v * maxTilt * 2);
  const rotateX = useTransform(sy, (v) => -v * maxTilt * 2);

  // Subtle 3D translate for "closer" effect
  const tx = useTransform(sx, (v) => v * 14);
  const ty = useTransform(sy, (v) => v * 14);

  // Cursor spotlight (follows pointer)
  const spotlight = useTransform([sx, sy], (latest) => {
    const arr = latest as number[];
    const x = (arr[0] + 0.5) * 100;
    const y = (arr[1] + 0.5) * 100;
    return `radial-gradient(520px circle at ${x}% ${y}%, rgba(255,255,255,0.55), transparent 60%)`;
  });

  // Parallax primary glow (follows pointer more aggressively)
  const glowX = useTransform(sx, (v) => v * 90);
  const glowY = useTransform(sy, (v) => v * 90);

  // Counter-parallax secondary glow (moves opposite for depth)
  const glow2X = useTransform(sx, (v) => v * -70);
  const glow2Y = useTransform(sy, (v) => v * -70);

  // Sheen line that tracks cursor
  const sheen = useTransform([sx, sy], (latest) => {
    const arr = latest as number[];
    const x = (arr[0] + 0.5) * 100;
    const y = (arr[1] + 0.5) * 100;
    return `radial-gradient(220px circle at ${x}% ${y}%, rgba(255,255,255,0.22), transparent 70%)`;
  });

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }

  function onEnter() {
    if (!reduce) setHovering(true);
  }
  function onLeave() {
    setHovering(false);
    px.set(0);
    py.set(0);
  }

  const style: MotionStyle = reduce
    ? {}
    : {
        rotateX,
        rotateY,
        x: tx,
        y: ty,
        transformPerspective: 1200,
        transformStyle: "preserve-3d",
        willChange: "transform",
      };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      style={style}
      animate={
        reduce
          ? undefined
          : {
              scale: hovering ? hoverScale : 1,
            }
      }
      transition={{ type: "spring", stiffness: 200, damping: 20, mass: 0.6 }}
      className={className}
    >
      {!reduce && (
        <>
          {/* Cursor spotlight */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-80 mix-blend-overlay"
            style={{ background: spotlight }}
          />
          {/* Sheen highlight */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light"
            style={{ background: sheen, opacity: hovering ? 1 : 0.6 }}
          />
          {/* Primary parallax glow */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/35 blur-3xl"
            style={{ x: glowX, y: glowY }}
            animate={{ opacity: hovering ? 0.95 : 0.6 }}
            transition={{ duration: 0.4 }}
          />
          {/* Secondary counter-parallax glow */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-secondary-container/70 blur-3xl"
            style={{ x: glow2X, y: glow2Y }}
            animate={{ opacity: hovering ? 0.9 : 0.5 }}
            transition={{ duration: 0.4 }}
          />
          {/* Inner ring on hover for closer-to-screen accent */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/15"
            animate={{ opacity: hovering ? 1 : 0 }}
            transition={{ duration: 0.25 }}
          />
        </>
      )}
      <div
        style={
          reduce
            ? undefined
            : { transform: "translateZ(50px)", transformStyle: "preserve-3d" }
        }
      >
        {children}
      </div>
    </motion.div>
  );
}
