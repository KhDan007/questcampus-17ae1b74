"use client";

import { useRef } from "react";
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
  /** Spotlight color (CSS color) */
  spotlightColor?: string;
};

/**
 * 3D tilt + cursor-following spotlight wrapper.
 * Honors prefers-reduced-motion (no tilt, no spotlight).
 */
export function TiltCard({
  children,
  className,
  maxTilt = 7,
  spotlightColor = "rgba(255,255,255,0.55)",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Pointer position normalized to [-0.5, 0.5]
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  // Spring-smoothed for buttery motion
  const sx = useSpring(px, { stiffness: 180, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 180, damping: 18, mass: 0.6 });

  // Tilt: y-axis rotates around vertical (left/right), x-axis flips for natural feel
  const rotateY = useTransform(sx, (v) => v * maxTilt * 2);
  const rotateX = useTransform(sy, (v) => -v * maxTilt * 2);

  // Spotlight position in % (0–100)
  const lightX = useTransform(sx, (v) => `${(v + 0.5) * 100}%`);
  const lightY = useTransform(sy, (v) => `${(v + 0.5) * 100}%`);

  // Glow that subtly follows
  const glowX = useTransform(sx, (v) => `${v * 40}px`);
  const glowY = useTransform(sy, (v) => `${v * 40}px`);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }

  function onLeave() {
    px.set(0);
    py.set(0);
  }

  const style: MotionStyle = reduce
    ? {}
    : {
        rotateX,
        rotateY,
        transformPerspective: 1100,
        transformStyle: "preserve-3d",
      };

  const spotlightStyle: MotionStyle = {
    background: `radial-gradient(360px circle at ${lightX.get()} ${lightY.get()}, ${spotlightColor}, transparent 60%)`,
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={style}
      className={className}
    >
      {!reduce && (
        <>
          {/* Cursor spotlight */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 mix-blend-overlay transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: useTransform(
                [lightX, lightY] as const,
                ([x, y]) =>
                  `radial-gradient(420px circle at ${x} ${y}, ${spotlightColor}, transparent 55%)`,
              ),
            }}
          />
          {/* Subtle parallax glow blob */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl"
            style={{ x: glowX, y: glowY }}
          />
        </>
      )}
      <div
        style={
          reduce
            ? undefined
            : { transform: "translateZ(40px)", transformStyle: "preserve-3d" }
        }
      >
        {children}
      </div>
    </motion.div>
  );
}
