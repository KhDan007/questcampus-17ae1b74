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
};

/**
 * 3D tilt + cursor-following spotlight wrapper.
 * Honors prefers-reduced-motion (no tilt, no spotlight).
 */
export function TiltCard({ children, className, maxTilt = 7 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Pointer position normalized to [-0.5, 0.5]
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  // Spring-smoothed for buttery motion
  const sx = useSpring(px, { stiffness: 180, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 180, damping: 18, mass: 0.6 });

  // Tilt
  const rotateY = useTransform(sx, (v) => v * maxTilt * 2);
  const rotateX = useTransform(sy, (v) => -v * maxTilt * 2);

  // Spotlight position as a single CSS string
  const spotlight = useTransform([sx, sy], (latest) => {
    const arr = latest as number[];
    const x = (arr[0] + 0.5) * 100;
    const y = (arr[1] + 0.5) * 100;
    return `radial-gradient(420px circle at ${x}% ${y}%, rgba(255,255,255,0.55), transparent 55%)`;
  });

  // Parallax glow translation
  const glowX = useTransform(sx, (v) => v * 40);
  const glowY = useTransform(sy, (v) => v * 40);

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
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-70 mix-blend-overlay"
            style={{ background: spotlight }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/25 blur-3xl"
            style={{ x: glowX, y: glowY }}
          />
        </>
      )}
      <div
        style={
          reduce
            ? undefined
            : { transform: "translateZ(30px)", transformStyle: "preserve-3d" }
        }
      >
        {children}
      </div>
    </motion.div>
  );
}
