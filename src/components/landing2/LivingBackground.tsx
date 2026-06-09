"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const UNIVERSITIES = [
  { name: "Harvard", hue: "#b3272c" },
  { name: "Stanford", hue: "#8c1515" },
  { name: "MIT", hue: "#2e4a7a" },
  { name: "Oxford", hue: "#002147" },
  { name: "Cambridge", hue: "#a3c1ad" },
  { name: "Yale", hue: "#0f4d92" },
  { name: "Princeton", hue: "#e77500" },
  { name: "UC Berkeley", hue: "#003262" },
  { name: "NYU", hue: "#57068c" },
  { name: "Columbia", hue: "#9bcbeb" },
  { name: "Imperial", hue: "#003e74" },
];

type Tile = {
  uni: (typeof UNIVERSITIES)[number];
  left: string;
  top: string;
  size: number;
  rot: number;
  depth: number; // 0..1 (0 = far, 1 = near)
  dur: number;
};

function makeTiles(): Tile[] {
  // Deterministic-ish layout so SSR/client match.
  const seeds = [
    [6, 8], [22, 64], [38, 22], [54, 70], [70, 12], [82, 48],
    [12, 36], [44, 90], [62, 38], [88, 78], [30, 4],
  ];
  return UNIVERSITIES.map((uni, i) => {
    const [l, t] = seeds[i] ?? [50, 50];
    const depth = ((i * 37) % 100) / 100;
    return {
      uni,
      left: `${l}%`,
      top: `${t}%`,
      size: 96 + Math.round(depth * 96),
      rot: ((i % 5) - 2) * 4,
      depth,
      dur: 8 + (i % 5),
    };
  });
}

export function LivingBackground() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll();
  const yFar = useTransform(scrollYProgress, [0, 1], ["0%", "-8%"]);
  const yMid = useTransform(scrollYProgress, [0, 1], ["0%", "-18%"]);
  const yNear = useTransform(scrollYProgress, [0, 1], ["0%", "-32%"]);

  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        setPointer({ x, y });
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  const tiles = makeTiles();

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-surface"
    >
      {/* Aurora mesh */}
      <div className="absolute inset-0">
        <div
          className="animate-aurora-1 absolute -left-[20%] -top-[20%] h-[80vh] w-[80vh] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(255,95,93,0.45), transparent 65%)" }}
        />
        <div
          className="animate-aurora-2 absolute -right-[15%] top-[10%] h-[85vh] w-[85vh] rounded-full blur-[140px]"
          style={{ background: "radial-gradient(circle, rgba(254,183,0,0.28), transparent 65%)" }}
        />
        <div
          className="animate-aurora-3 absolute -bottom-[20%] left-[20%] h-[90vh] w-[90vh] rounded-full blur-[140px]"
          style={{ background: "radial-gradient(circle, rgba(113,162,103,0.30), transparent 65%)" }}
        />
        <div
          className="animate-aurora-1 absolute right-[15%] bottom-[5%] h-[55vh] w-[55vh] rounded-full blur-[120px]"
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
        pointer={pointer}
        depthMultiplier={6}
        opacity={0.35}
      />
      <FloatLayer
        tiles={tiles.filter((_, i) => i % 3 === 1)}
        y={yMid}
        pointer={pointer}
        depthMultiplier={14}
        opacity={0.5}
      />
      <FloatLayer
        tiles={tiles.filter((_, i) => i % 3 === 2)}
        y={yNear}
        pointer={pointer}
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
  pointer,
  depthMultiplier,
  opacity,
}: {
  tiles: Tile[];
  y: ReturnType<typeof useTransform<number, string>>;
  pointer: { x: number; y: number };
  depthMultiplier: number;
  opacity: number;
}) {
  return (
    <motion.div className="absolute inset-0" style={{ y, opacity }}>
      {tiles.map((tile, i) => (
        <div
          key={tile.uni.name + i}
          className="animate-float-bob absolute"
          style={{
            left: tile.left,
            top: tile.top,
            width: tile.size,
            height: tile.size,
            // CSS vars consumed by float-bob keyframes
            ["--rot" as string]: `${tile.rot}deg`,
            ["--bob-dur" as string]: `${tile.dur}s`,
            transform: `translate3d(${pointer.x * depthMultiplier}px, ${
              pointer.y * depthMultiplier
            }px, 0)`,
            transition: "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <UniTile uni={tile.uni} size={tile.size} />
        </div>
      ))}
    </motion.div>
  );
}

function UniTile({ uni, size }: { uni: { name: string; hue: string }; size: number }) {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-xl ring-1 ring-on-surface/10 backdrop-blur-[2px]"
      style={{
        background: `linear-gradient(135deg, ${uni.hue}cc 0%, ${uni.hue}66 60%, transparent 100%)`,
        boxShadow: "0 12px 32px -12px rgba(28,28,25,0.18)",
      }}
    >
      <div className="absolute inset-0 opacity-30 mix-blend-soft-light">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <path
            d="M50 12 L60 30 L82 32 L66 48 L72 70 L50 60 L28 70 L34 48 L18 32 L40 30 Z"
            fill="white"
            opacity="0.55"
          />
        </svg>
      </div>
      <div className="absolute inset-x-2 bottom-2">
        <div className="rounded-md bg-surface/85 px-2 py-1 text-center font-[var(--font-label)] text-[10px] font-semibold tracking-wide text-on-surface backdrop-blur">
          {uni.name}
        </div>
      </div>
      {size > 130 && (
        <div className="absolute inset-x-3 top-3 h-[1px] bg-white/30" aria-hidden />
      )}
    </div>
  );
}
