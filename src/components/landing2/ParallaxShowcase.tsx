"use client";

import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { UNI_LOGOS } from "@/assets/unis";

const ROW_A = ["Harvard", "Stanford", "MIT", "Oxford", "Cambridge", "Yale"];
const ROW_B = ["Princeton", "UC Berkeley", "NYU", "Columbia", "Imperial", "ETH Zurich"];
const ROW_C = ["McGill", "Edinburgh", "Trinity", "NUS", "Tokyo", "Sciences Po"];

const HUES: Record<string, string> = {
  Harvard: "#b3272c",
  Stanford: "#8c1515",
  MIT: "#2e4a7a",
  Oxford: "#002147",
  Cambridge: "#a3c1ad",
  Yale: "#0f4d92",
  Princeton: "#e77500",
  "UC Berkeley": "#003262",
  NYU: "#57068c",
  Columbia: "#9bcbeb",
  Imperial: "#003e74",
  "ETH Zurich": "#1f407a",
  McGill: "#ed1b2f",
  Edinburgh: "#041e42",
  Trinity: "#0c2340",
  NUS: "#003d7c",
  Tokyo: "#22409a",
  "Sciences Po": "#cc0033",
};

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return m;
}

export function ParallaxShowcase() {
  const ref = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const isMobile = useIsMobile();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const yA = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["20%", "-30%"]);
  const yB = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-15%", "25%"]);
  const yC = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["10%", "-20%"]);

  // Raw cursor position in stage-local pixels (null when outside).
  const cx = useMotionValue<number | null>(null);
  const cy = useMotionValue<number | null>(null);
  const active = useMotionValue(0); // 0..1, gates attraction

  // Glow follows cursor in % of stage
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);
  const sGlowX = useSpring(glowX, { stiffness: 120, damping: 24 });
  const sGlowY = useSpring(glowY, { stiffness: 120, damping: 24 });
  const sActive = useSpring(active, { stiffness: 120, damping: 24 });

  useEffect(() => {
    if (reduce) return;
    const el = stageRef.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        cx.set(x);
        cy.set(y);
        glowX.set((x / rect.width) * 100);
        glowY.set((y / rect.height) * 100);
        active.set(1);
      });
    };
    const onLeave = () => {
      active.set(0);
      cx.set(null);
      cy.set(null);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [reduce, cx, cy, glowX, glowY, active]);

  // Mobile-tuned tile dimensions; desktop keeps the original generous sizing.
  const sizes = isMobile
    ? { a: 76, b: 100, c: 80, gapA: 12, gapB: 16, gapC: 14, topB: 110, topC: 240, height: 360 }
    : { a: 130, b: 170, c: 140, gapA: 20, gapB: 28, gapC: 24, topB: 180, topC: 400, height: 620 };

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden bg-inverse-surface px-4 py-20 text-inverse-on-surface sm:px-8 sm:py-36"
    >
      {/* Inverse aurora */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-50">
        <div
          className="animate-aurora-1 absolute -left-1/4 top-1/4 h-[60vh] w-[60vh] rounded-full blur-[140px]"
          style={{ background: "radial-gradient(circle, rgba(255,95,93,0.45), transparent 65%)" }}
        />
        <div
          className="animate-aurora-2 absolute -right-1/4 bottom-1/4 h-[60vh] w-[60vh] rounded-full blur-[140px]"
          style={{ background: "radial-gradient(circle, rgba(254,183,0,0.40), transparent 65%)" }}
        />
      </div>
      <div aria-hidden className="qc-grain absolute inset-0 -z-10 opacity-[0.12]" />

      <div className="relative mx-auto max-w-(--container-content)">
        <div className="mx-auto max-w-3xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.5 }}
            className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-secondary-container"
          >
            One workspace, every university
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-4 text-display-lg-mobile sm:text-display-lg"
          >
            Search{" "}
            <span className="qc-text-gradient">11,000+ universities</span> worldwide —<br />
            shortlist, match, and apply from one place.
          </motion.h2>
        </div>

        <div
          ref={stageRef}
          className="relative mt-12 sm:mt-16 w-full overflow-hidden [perspective:1200px]"
          style={{ height: sizes.height }}
        >
          {/* Cursor-following spotlight */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background: useTransform(
                [sGlowX, sGlowY, sActive] as MotionValue<number>[],
                ([x, y, a]) =>
                  `radial-gradient(420px circle at ${x}% ${y}%, rgba(255,183,77,${0.22 * (a as number)}), rgba(255,95,93,${0.12 * (a as number)}) 35%, transparent 65%)`,
              ),
            }}
          />

          <motion.div
            style={{ y: yA, filter: "blur(2px)", opacity: 0.55 }}
            className="absolute inset-x-0 top-0 flex justify-center will-change-transform"
          >
            <TileRow names={ROW_A} size={sizes.a} gap={sizes.gapA} rot={-2} stageRef={stageRef} cx={cx} cy={cy} active={sActive} pull={0.55} />
          </motion.div>
          <motion.div
            style={{ y: yB, top: sizes.topB }}
            className="absolute inset-x-0 flex justify-center will-change-transform"
          >
            <TileRow names={ROW_B} size={sizes.b} gap={sizes.gapB} rot={1} highlight stageRef={stageRef} cx={cx} cy={cy} active={sActive} pull={0.9} />
          </motion.div>
          <motion.div
            style={{ y: yC, filter: "blur(3px)", opacity: 0.45, top: sizes.topC }}
            className="absolute inset-x-0 flex justify-center will-change-transform"
          >
            <TileRow names={ROW_C} size={sizes.c} gap={sizes.gapC} rot={3} stageRef={stageRef} cx={cx} cy={cy} active={sActive} pull={0.7} />
          </motion.div>

          {/* edge fades */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-inverse-surface to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-inverse-surface to-transparent"
          />
        </div>
      </div>
    </section>
  );
}

function TileRow({
  names,
  size,
  gap,
  rot,
  highlight = false,
  stageRef,
  cx,
  cy,
  active,
  pull,
}: {
  names: string[];
  size: number;
  gap: number;
  rot: number;
  highlight?: boolean;
  stageRef: React.RefObject<HTMLDivElement | null>;
  cx: MotionValue<number | null>;
  cy: MotionValue<number | null>;
  active: MotionValue<number>;
  pull: number;
}) {
  return (
    <div className="flex items-center" style={{ gap }}>
      {names.map((n, i) => (
        <ShowcaseTile
          key={n + i}
          name={n}
          size={size}
          rot={rot + (i % 2 === 0 ? -1 : 1)}
          highlight={highlight}
          stageRef={stageRef}
          cx={cx}
          cy={cy}
          active={active}
          pull={pull}
        />
      ))}
    </div>
  );
}

function ShowcaseTile({
  name,
  size,
  rot,
  highlight,
  stageRef,
  cx,
  cy,
  active,
  pull,
}: {
  name: string;
  size: number;
  rot: number;
  highlight: boolean;
  stageRef: React.RefObject<HTMLDivElement | null>;
  cx: MotionValue<number | null>;
  cy: MotionValue<number | null>;
  active: MotionValue<number>;
  pull: number;
}) {
  const hue = HUES[name] ?? "#b3272c";
  const logo = UNI_LOGOS[name];
  const tileRef = useRef<HTMLDivElement | null>(null);

  // Animated targets, spring-smoothed for buttery motion.
  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const scale = useMotionValue(1);
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const lift = useMotionValue(0); // 0..1 proximity

  const sx = useSpring(tx, { stiffness: 180, damping: 20, mass: 0.6 });
  const sy = useSpring(ty, { stiffness: 180, damping: 20, mass: 0.6 });
  const sScale = useSpring(scale, { stiffness: 220, damping: 22 });
  const sTiltX = useSpring(tiltX, { stiffness: 180, damping: 22 });
  const sTiltY = useSpring(tiltY, { stiffness: 180, damping: 22 });
  const sLift = useSpring(lift, { stiffness: 180, damping: 24 });

  useEffect(() => {
    let raf = 0;
    const RADIUS = 260; // px of influence
    const MAX_PULL = 38 * pull;

    const update = () => {
      const tile = tileRef.current;
      const stage = stageRef.current;
      const a = active.get();
      const px = cx.get();
      const py = cy.get();

      if (!tile || !stage || px == null || py == null || a <= 0.001) {
        tx.set(0);
        ty.set(0);
        scale.set(1);
        tiltX.set(0);
        tiltY.set(0);
        lift.set(0);
        return;
      }

      const sRect = stage.getBoundingClientRect();
      const tRect = tile.getBoundingClientRect();
      // Tile center in stage-local coords
      const tcx = tRect.left - sRect.left + tRect.width / 2;
      const tcy = tRect.top - sRect.top + tRect.height / 2;
      const dx = px - tcx;
      const dy = py - tcy;
      const dist = Math.hypot(dx, dy);
      const t = Math.max(0, 1 - dist / RADIUS); // 0..1 proximity (smooth falloff)
      const ease = t * t * (3 - 2 * t); // smoothstep

      const nx = dist > 0.001 ? dx / dist : 0;
      const ny = dist > 0.001 ? dy / dist : 0;

      tx.set(nx * MAX_PULL * ease * a);
      ty.set(ny * MAX_PULL * ease * a);
      scale.set(1 + 0.14 * ease * a);
      // tilt away from cursor for 3D parallax illusion
      tiltY.set(nx * 10 * ease * a);
      tiltX.set(-ny * 10 * ease * a);
      lift.set(ease * a);
    };

    const onFrame = () => {
      update();
      raf = requestAnimationFrame(onFrame);
    };
    raf = requestAnimationFrame(onFrame);
    return () => cancelAnimationFrame(raf);
  }, [stageRef, cx, cy, active, pull, tx, ty, scale, tiltX, tiltY, lift]);

  const shadow = useTransform(sLift, (v) =>
    highlight
      ? `0 ${20 + v * 40}px ${50 + v * 40}px -20px rgba(0,0,0,${0.55 + v * 0.25}), 0 0 ${v * 40}px rgba(255,183,77,${v * 0.45})`
      : `0 ${16 + v * 30}px ${36 + v * 30}px -20px rgba(0,0,0,${0.5 + v * 0.2}), 0 0 ${v * 28}px rgba(255,183,77,${v * 0.35})`,
  );
  const z = useTransform(sLift, (v) => v * 60);
  const sheenX = useMotionValue(50);
  useEffect(() => {
    const unsub = cx.on("change", (v) => {
      const t = tileRef.current;
      const stage = stageRef.current;
      if (!t || !stage || v == null) {
        sheenX.set(50);
        return;
      }
      const sRect = stage.getBoundingClientRect();
      const tRect = t.getBoundingClientRect();
      const localX = v - (tRect.left - sRect.left);
      sheenX.set(Math.max(-20, Math.min(120, (localX / tRect.width) * 100)));
    });
    return unsub;
  }, [cx, sheenX, stageRef]);

  return (
    <motion.div
      ref={tileRef}
      className="relative shrink-0 overflow-hidden rounded-xl ring-1 ring-white/15 [transform-style:preserve-3d]"
      style={{
        width: size,
        height: size,
        x: sx,
        y: sy,
        rotate: rot,
        scale: sScale,
        rotateX: sTiltX,
        rotateY: sTiltY,
        z,
        background: logo
          ? "#ffffff"
          : `linear-gradient(135deg, ${hue}ee 0%, ${hue}88 60%, ${hue}33 100%)`,
        boxShadow: shadow,
      }}
    >
      {logo ? (
        <img
          src={logo}
          alt={name}
          className="absolute inset-0 h-full w-full object-contain p-3"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 opacity-25 mix-blend-soft-light">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <path
              d="M50 12 L60 30 L82 32 L66 48 L72 70 L50 60 L28 70 L34 48 L18 32 L40 30 Z"
              fill="white"
            />
          </svg>
        </div>
      )}
      {/* Specular sheen that brightens with proximity */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-overlay"
        style={{
          background: useTransform(
            [sheenX, sLift] as MotionValue<number>[],
            ([x, v]) =>
              `radial-gradient(120% 80% at ${x}% 30%, rgba(255,255,255,${0.25 + (v as number) * 0.45}), transparent 60%)`,
          ),
        }}
      />
      <div className="absolute inset-x-1.5 bottom-1.5 sm:inset-x-2 sm:bottom-2">
        <div className="rounded-md bg-black/55 px-1.5 py-0.5 sm:px-2 sm:py-1 text-center font-[var(--font-label)] text-[9px] sm:text-[11px] font-semibold tracking-wide text-white backdrop-blur-sm truncate">
          {name}
        </div>
      </div>
    </motion.div>
  );
}
