import { CTAButton } from "./CTAButton";
import { Reveal } from "./Reveal";
import { WAITLIST_PATH } from "@/lib/routes";
import {
  PRICE_FULL,
  WAITLIST_BASE_DISCOUNT,
  REFERRAL_EXTRA_DISCOUNT,
  fmtUsd,
} from "@/lib/config";

const ITEMS = [
  {
    icon: "📝",
    title: "Essay Writing Assistant",
    body: "AI-guided personal statement + supplemental essays tailored to each university's prompts.",
    status: "Coming soon" as const,
  },
  {
    icon: "📋",
    title: "Extracurricular Manager",
    body: "Track, organize, and present your ECs strategically to strengthen your application narrative.",
    status: "Coming soon" as const,
  },
  {
    icon: "📄",
    title: "Document Helper",
    body: "Checklists, templates, and AI review for transcripts, recommendation letters, and portfolios.",
    status: "Coming soon" as const,
  },
  {
    icon: "🗓️",
    title: "Application Tracker",
    body: "Deadlines, status, and notes per school — never miss a window again.",
    status: "Coming soon" as const,
  },
  {
    icon: "🤖",
    title: "Auto-Apply Agent",
    body: "Fill and submit applications autonomously. The endgame.",
    status: "Later" as const,
  },
];

function StatusChip({ status }: { status: "Coming soon" | "Later" }) {
  const cls =
    status === "Coming soon"
      ? "bg-tertiary-container/20 text-tertiary-fixed-dim"
      : "bg-white/10 text-outline-variant";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-label-sm font-medium ${cls}`}>
      {status}
    </span>
  );
}

function RoadmapCard({ item }: { item: (typeof ITEMS)[number] }) {
  return (
    <div className="flex h-full min-w-[78%] snap-start flex-col rounded-lg bg-white/[0.04] p-5 ring-1 ring-white/10 md:min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-3xl" aria-hidden>
          {item.icon}
        </span>
        <StatusChip status={item.status} />
      </div>
      <h3 className="mt-4 text-headline-sm text-inverse-on-surface">
        {item.title}
      </h3>
      <p className="mt-2 text-body-md text-outline-variant">{item.body}</p>
    </div>
  );
}

export function RoadmapSection() {
  return (
    <section className="bg-inverse-surface px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[1100px]">
        <Reveal>
          <p className="text-label-md font-semibold uppercase text-secondary-container">
            Coming soon
          </p>
          <h2 className="mt-3 text-display-lg-mobile text-inverse-on-surface">
            This is just the beginning.
          </h2>
          <p className="mt-3 max-w-[640px] text-body-lg text-outline-variant">
            QuestCampus is building every tool a student needs — from first search
            to final submission.
          </p>
        </Reveal>

        {/* Mobile: horizontal scroll w/ right fade hint. Desktop: 2×2 + centered 5th. */}
        <div className="relative mt-12">
          <div className="flex snap-x gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:pb-0">
            {ITEMS.map((item, i) => (
              <Reveal
                key={item.title}
                delay={i * 0.1}
                y={30}
                className={
                  i === ITEMS.length - 1
                    ? "md:col-span-2 md:mx-auto md:w-1/2"
                    : undefined
                }
              >
                <RoadmapCard item={item} />
              </Reveal>
            ))}
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-inverse-surface to-transparent md:hidden"
          />
        </div>

        <Reveal delay={0.1}>
          <div className="mt-12 flex flex-col items-center text-center">
            <p className="max-w-[620px] text-body-md text-inverse-on-surface">
              Waitlist users get {WAITLIST_BASE_DISCOUNT}% off the full product (
              {fmtUsd(PRICE_FULL)}) when these ship. Every referral stacks another{" "}
              {REFERRAL_EXTRA_DISCOUNT}% off —{" "}
              <span className="font-semibold text-secondary-container">
                it can reach 100% free.
              </span>
            </p>
            <div className="mt-6">
              <CTAButton href={WAITLIST_PATH} variant="amber" hoverScale={1.03}>
                Join the waitlist →
              </CTAButton>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
