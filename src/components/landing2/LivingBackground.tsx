"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { UNI_LOGOS } from "@/assets/unis";

const UNIVERSITIES = [
  { name: "Harvard", hue: "#b3272c" },
  { name: "Stanford", hue: "#8c1515" },
  { name: "MIT", hue: "#2e4a7a" },
  { name: "Oxford", hue: "#002147" },
  { name: "Yale", hue: "#0f4d92" },
  { name: "Princeton", hue: "#e77500" },
];

type Tile = {
  uni: (typeof UNIVERSITIES)[number];
  left: string;
  top: string;
  size: number;
  rot: number;
  depth: number;
  dur: number;
};

function makeTiles(scale: number): Tile[] {
  // Keep tiles clear of the center column (roughly 22%-78%) where the
  // headline + quiz live. Alternate left / right edges down the page.
  const seeds: Array<[number, number]> = [
    [4, 8],
    [86, 14],
    [2, 44],
    [90, 52],
    [6, 78],
    [84, 84],
  ];
  return UNIVERSITIES.map((uni, i) => {
    const [l, t] = seeds[i] ?? [50, 50];
    const depth = ((i * 37) % 100) / 100;
    return {
      uni,
      left: `${l}%`,
      top: `${t}%`,
      size: Math.round((88 + depth * 64) * scale),
      rot: ((i % 5) - 2) * 4,
      depth,
      dur: 8 + (i % 5),
    };
  });
}

// Synchronously read mobile state on first render to avoid mounting the
// expensive desktop tree on phones for a frame.
function getInitialIsMobile() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

function useIsMobile() {
  const [m, setM] = useState<boolean>(getInitialIsMobile);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return m;
}

// Top-level: pick a cheap static background on mobile, the full animated
// scene on desktop. Splitting components ensures none of the motion hooks,
// scroll listeners, or pointer trackers ever mount on phones.
export function LivingBackground() {
  const isMobile = useIsMobile();
  return isMobile ? <StaticBackground /> : <DesktopLivingBackground />;
}

// Zero-animation, zero-listener background for mobile. Pure CSS gradients
// over a solid surface — fully GPU-composited, no repaints, no JS work.
function StaticBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-surface"
      style={{
        backgroundImage: [
          "radial-gradient(60vmax 60vmax at 15% 10%, rgba(255,95,93,0.22), transparent 60%)",
          "radial-gradient(55vmax 55vmax at 90% 20%, rgba(254,183,0,0.18), transparent 60%)",
          "radial-gradient(70vmax 70vmax at 50% 95%, rgba(113,162,103,0.20), transparent 60%)",
        ].join(", "),
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(253,249,245,0.85) 100%)",
        }}
      />
    </div>
  );
}

function DesktopLivingBackground() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll();
  const yFar = useTransform(scrollYProgress, [0, 1], ["0%", "-8%"]);
  const yMid = useTransform(scrollYProgress, [0, 1], ["0%", "-18%"]);
  const yNear = useTransform(scrollYProgress, [0, 1], ["0%", "-32%"]);

  // Motion values for pointer — no React state, no re-renders per move.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spx = useSpring(px, { stiffness: 60, damping: 18, mass: 0.6 });
  const spy = useSpring(py, { stiffness: 60, damping: 18, mass: 0.6 });

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    let nx = 0;
    let ny = 0;
    let pending = false;
    const flush = () => {
      pending = false;
      px.set(nx);
      py.set(ny);
    };
    const onMove = (e: PointerEvent) => {
      nx = (e.clientX / window.innerWidth - 0.5) * 2;
      ny = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!pending) {
        pending = true;
        raf = requestAnimationFrame(flush);
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduce, px, py]);

  const tiles = makeTiles(1);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-surface [contain:strict]"
    >
      {/* Aurora mesh */}
      <div className="absolute inset-0">
        <div
          className="animate-aurora-1 absolute -left-[20%] -top-[20%] h-[80vh] w-[80vh] rounded-full blur-[90px] will-change-transform"
          style={{ background: "radial-gradient(circle, rgba(255,95,93,0.45), transparent 65%)" }}
        />
        <div
          className="animate-aurora-2 absolute -right-[15%] top-[10%] h-[85vh] w-[85vh] rounded-full blur-[100px] will-change-transform"
          style={{ background: "radial-gradient(circle, rgba(254,183,0,0.28), transparent 65%)" }}
        />
        <div
          className="animate-aurora-3 absolute -bottom-[20%] left-[20%] h-[90vh] w-[90vh] rounded-full blur-[100px] will-change-transform"
          style={{ background: "radial-gradient(circle, rgba(113,162,103,0.30), transparent 65%)" }}
        />
        <div
          className="animate-aurora-1 absolute right-[15%] bottom-[5%] h-[55vh] w-[55vh] rounded-full blur-[90px] will-change-transform"
          style={{ background: "radial-gradient(circle, rgba(179,39,44,0.30), transparent 65%)", animationDelay: "-6s" }}
        />
      </div>

      {/* Starfield dots */}
      <div className="absolute inset-0 opacity-[0.35]">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="stars" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="20" r="0.8" fill="#5a413f" />
              <circle cx="80" cy="40" r="0.5" fill="#5a413f" />
              <circle cx="40" cy="90" r="0.6" fill="#5a413f" />
              <circle cx="100" cy="100" r="0.4" fill="#5a413f" />
              <circle cx="60" cy="10" r="0.5" fill="#5a413f" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#stars)" />
        </svg>
      </div>

      {/* Floating university tiles — 3 parallax layers */}
      <FloatLayer
        tiles={tiles.filter((_, i) => i % 3 === 0)}
        y={yFar}
        px={spx}
        py={spy}
        depthMultiplier={6}
        opacity={0.35}
      />
      <FloatLayer
        tiles={tiles.filter((_, i) => i % 3 === 1)}
        y={yMid}
        px={spx}
        py={spy}
        depthMultiplier={14}
        opacity={0.5}
      />
      <FloatLayer
        tiles={tiles.filter((_, i) => i % 3 === 2)}
        y={yNear}
        px={spx}
        py={spy}
        depthMultiplier={24}
        opacity={0.7}
      />

      {/* Grain */}
      <div className="qc-grain absolute inset-0 opacity-[0.35] mix-blend-multiply" />

      {/* Soft vignette toward edges */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(253,249,245,0.85) 100%)",
        }}
      />
    </div>
  );
}

function FloatLayer({
  tiles,
  y,
  px,
  py,
  depthMultiplier,
  opacity,
}: {
  tiles: Tile[];
  y: MotionValue<string>;
  px: MotionValue<number>;
  py: MotionValue<number>;
  depthMultiplier: number;
  opacity: number;
}) {
  // Single shared transform per layer, GPU-composited via motion value.
  const tx = useTransform(px, (v) => v * depthMultiplier);
  const ty = useTransform(py, (v) => v * depthMultiplier);
  const transform = useMotionTemplate`translate3d(${tx}px, ${ty}px, 0)`;

  return (
    <motion.div className="absolute inset-0 will-change-transform" style={{ y, opacity }}>
      <motion.div className="absolute inset-0 will-change-transform" style={{ transform }}>
        {tiles.map((tile, i) => (
          <div
            key={tile.uni.name + i}
            className="animate-float-bob absolute will-change-transform"
            style={{
              left: tile.left,
              top: tile.top,
              width: tile.size,
              height: tile.size,
              ["--rot" as string]: `${tile.rot}deg`,
              ["--bob-dur" as string]: `${tile.dur}s`,
            }}
          >
            <UniTile uni={tile.uni} size={tile.size} />
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

function UniTile({ uni, size }: { uni: { name: string; hue: string }; size: number }) {
  const logo = UNI_LOGOS[uni.name];
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-xl ring-1 ring-on-surface/10"
      style={{
        background: logo
          ? `linear-gradient(135deg, #ffffff 0%, #ffffffcc 100%)`
          : `linear-gradient(135deg, ${uni.hue}cc 0%, ${uni.hue}66 60%, transparent 100%)`,
        boxShadow: "0 12px 32px -12px rgba(28,28,25,0.18)",
      }}
    >
      {logo ? (
        <img
          src={logo}
          alt={uni.name}
          className="absolute inset-0 h-full w-full object-contain p-3"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="absolute inset-0 opacity-30 mix-blend-soft-light">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <path
              d="M50 12 L60 30 L82 32 L66 48 L72 70 L50 60 L28 70 L34 48 L18 32 L40 30 Z"
              fill="white"
              opacity="0.55"
            />
          </svg>
        </div>
      )}
      <div className="absolute inset-x-2 bottom-2">
        <div className="rounded-md bg-surface/85 px-2 py-1 text-center font-[var(--font-label)] text-[10px] font-semibold tracking-wide text-on-surface">
          {uni.name}
        </div>
      </div>
      {size > 130 && (
        <div className="absolute inset-x-3 top-3 h-[1px] bg-white/30" aria-hidden />
      )}
    </div>
  );
}
