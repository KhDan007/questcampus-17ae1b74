"use client";

import { motion } from "framer-motion";
import {
  PenLine,
  Activity,
  FileText,
  CalendarClock,
  Bot,
} from "lucide-react";

const FEATURES = [
  {
    icon: PenLine,
    title: "Essay Writing Assistant",
    body: "AI-guided personal statement + supplemental essays tailored to each university's prompts.",
    badge: "Coming soon",
    badgeTone: "soon" as const,
  },
  {
    icon: Activity,
    title: "Extracurricular Manager",
    body: "Track, organize and present your ECs strategically to strengthen your application narrative.",
    badge: "Coming soon",
    badgeTone: "soon" as const,
  },
  {
    icon: FileText,
    title: "Document Helper",
    body: "Checklists, templates & AI review for transcripts, recommendation letters, and portfolios.",
    badge: "Coming soon",
    badgeTone: "soon" as const,
  },
  {
    icon: CalendarClock,
    title: "Application Tracker",
    body: "Deadlines, status & notes per school — never miss a window again.",
    badge: "Coming soon",
    badgeTone: "soon" as const,
  },
];

export function RoadmapV2() {
  return (
    <section id="roadmap" className="relative px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-(--container-content)">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55 }}
          className="max-w-2xl"
        >
          <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
            What's coming
          </p>
          <h2 className="mt-3 text-display-lg-mobile text-on-surface sm:text-display-lg">
            Matching is just the start. <br />
            <span className="qc-text-gradient">Then we apply for you.</span>
          </h2>
          <p className="mt-4 text-body-lg text-on-surface-variant">
            Waitlist members get founding access — and the Essay Assistant free for life.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.article
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6 }}
              className="group relative flex h-full flex-col rounded-lg border-2 border-on-surface bg-surface-container-lowest p-5 qc-hard-shadow transition-shadow hover:shadow-[6px_6px_0_0_var(--color-primary)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary-fixed text-primary transition-transform group-hover:scale-110">
                  <f.icon className="h-5 w-5" strokeWidth={2.2} />
                </div>
                <Badge tone={f.badgeTone}>{f.badge}</Badge>
              </div>
              <h3 className="mt-4 text-headline-sm text-on-surface">{f.title}</h3>
              <p className="mt-2 flex-1 text-body-md text-on-surface-variant">{f.body}</p>
            </motion.article>
          ))}
        </div>

        {/* Endgame card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="relative mt-8 overflow-hidden rounded-xl border-2 border-on-surface bg-inverse-surface text-inverse-on-surface qc-hard-shadow-primary"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div
              className="animate-aurora-1 absolute -left-20 top-1/2 h-[60vh] w-[60vh] -translate-y-1/2 rounded-full blur-[120px]"
              style={{ background: "radial-gradient(circle, rgba(255,95,93,0.55), transparent 65%)" }}
            />
            <div
              className="animate-aurora-2 absolute -right-20 top-0 h-[40vh] w-[40vh] rounded-full blur-[120px]"
              style={{ background: "radial-gradient(circle, rgba(254,183,0,0.45), transparent 65%)" }}
            />
          </div>

          <div className="relative grid gap-8 p-8 sm:p-12 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-secondary-container text-on-secondary-container">
                  <Bot className="h-6 w-6" strokeWidth={2.2} />
                </span>
                <Badge tone="later">The endgame</Badge>
              </div>
              <h3 className="mt-5 text-headline-lg sm:text-display-lg-mobile">
                Auto-Apply Agent
              </h3>
              <p className="mt-3 max-w-xl text-body-lg text-inverse-on-surface/80">
                One profile. Every application filled, formatted, and submitted —
                autonomously, with you in the loop only when it matters.
              </p>
            </div>
            <a
              href="#waitlist"
              className="inline-flex items-center justify-center gap-2 self-start rounded-md border-2 border-secondary-container bg-secondary-container px-6 py-3.5 font-display text-headline-sm font-bold text-on-secondary-container transition-all hover:-translate-y-0.5 hover:translate-x-0.5 lg:self-center"
              style={{ boxShadow: "5px 5px 0 0 rgba(254,183,0,0.4)" }}
            >
              Get founding access
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "soon" | "later";
  children: React.ReactNode;
}) {
  const cls =
    tone === "soon"
      ? "bg-tertiary-fixed text-on-tertiary-fixed-variant"
      : "bg-secondary-container text-on-secondary-container";
  return (
    <span
      className={`rounded-md px-2 py-1 font-[var(--font-label)] text-label-sm font-bold uppercase tracking-wider ${cls}`}
    >
      {children}
    </span>
  );
}
