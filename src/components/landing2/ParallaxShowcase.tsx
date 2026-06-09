"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const ROW_A = ["Harvard", "Stanford", "MIT", "Oxford", "Cambridge", "Yale"];
const ROW_B = ["Princeton", "UC Berkeley", "NYU", "Columbia", "Imperial", "ETH Zürich"];
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
  "ETH Zürich": "#1f407a",
  McGill: "#ed1b2f",
  Edinburgh: "#041e42",
  Trinity: "#0c2340",
  NUS: "#003d7c",
  Tokyo: "#22409a",
  "Sciences Po": "#cc0033",
};

export function ParallaxShowcase() {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const yA = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["20%", "-30%"]);
  const yB = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-15%", "25%"]);
  const yC = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["10%", "-20%"]);

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden bg-inverse-surface px-5 py-28 text-inverse-on-surface sm:px-8 sm:py-36"
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
            The galaxy of dream schools
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-4 text-display-lg-mobile sm:text-display-lg"
          >
            From{" "}
            <span className="qc-text-gradient">11,000+ universities</span> worldwide —<br />
            we find your 20.
          </motion.h2>
        </div>

        <div className="relative mt-16 h-[520px] sm:h-[620px]">
          <motion.div
            style={{ y: yA, filter: "blur(2px)", opacity: 0.55 }}
            className="absolute inset-x-0 top-0 flex justify-center"
          >
            <TileRow names={ROW_A} size={130} gap={20} rot={-2} />
          </motion.div>
          <motion.div
            style={{ y: yB }}
            className="absolute inset-x-0 top-[180px] flex justify-center"
          >
            <TileRow names={ROW_B} size={170} gap={28} rot={1} highlight />
          </motion.div>
          <motion.div
            style={{ y: yC, filter: "blur(3px)", opacity: 0.45 }}
            className="absolute inset-x-0 top-[400px] flex justify-center"
          >
            <TileRow names={ROW_C} size={140} gap={24} rot={3} />
          </motion.div>

          {/* edge fades */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-inverse-surface to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-inverse-surface to-transparent"
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
}: {
  names: string[];
  size: number;
  gap: number;
  rot: number;
  highlight?: boolean;
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
}: {
  name: string;
  size: number;
  rot: number;
  highlight: boolean;
}) {
  const hue = HUES[name] ?? "#b3272c";
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl ring-1 ring-white/15"
      style={{
        width: size,
        height: size,
        transform: `rotate(${rot}deg)`,
        background: `linear-gradient(135deg, ${hue}ee 0%, ${hue}88 60%, ${hue}33 100%)`,
        boxShadow: highlight
          ? "0 30px 60px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)"
          : "0 20px 40px -20px rgba(0,0,0,0.5)",
      }}
    >
      <div className="absolute inset-0 opacity-25 mix-blend-soft-light">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <path
            d="M50 12 L60 30 L82 32 L66 48 L72 70 L50 60 L28 70 L34 48 L18 32 L40 30 Z"
            fill="white"
          />
        </svg>
      </div>
      <div className="absolute inset-x-2 bottom-2">
        <div className="rounded-md bg-black/55 px-2 py-1 text-center font-[var(--font-label)] text-[11px] font-semibold tracking-wide text-white backdrop-blur-sm">
          {name}
        </div>
      </div>
    </div>
  );
}
