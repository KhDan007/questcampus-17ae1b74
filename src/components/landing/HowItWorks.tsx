import { CTAButton } from "./CTAButton";
import { Reveal } from "./Reveal";
import { ONBOARDING_PATH } from "@/lib/routes";

// --- Static UI teaser mockups (no real data, just visual flavor) ---

function ProgressTeaser() {
  return (
    <div className="rounded-md bg-surface-container-lowest p-4 ring-1 ring-outline-variant/60">
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
        <div className="h-full w-[42%] rounded-full bg-primary-container" />
      </div>
      <p className="mt-2 text-label-sm text-on-surface-variant">
        Chapter 3 of 7 — Your Dreams &amp; Ambitions
      </p>
    </div>
  );
}

function MatchingTeaser() {
  return (
    <div className="rounded-md bg-surface-container-lowest p-4 ring-1 ring-outline-variant/60">
      <p className="text-label-sm text-on-surface-variant">
        Finding your best matches…
      </p>
      <div className="mt-3 space-y-2">
        {[100, 80, 60].map((w) => (
          <div
            key={w}
            className="h-3 rounded-full bg-surface-container-high"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function CardTeaser() {
  return (
    <div className="rounded-md bg-surface-container-lowest p-4 ring-1 ring-outline-variant/60">
      <div className="flex items-center justify-between">
        <span className="text-label-md font-semibold text-on-surface">
          TU Delft
        </span>
        <span className="rounded-full bg-secondary-container px-2 py-0.5 text-label-sm font-semibold text-primary">
          92% match
        </span>
      </div>
      <p className="mt-1 text-label-sm text-on-surface-variant">
        Delft, Netherlands
      </p>
      <span className="mt-3 inline-block rounded-full bg-tertiary-container/15 px-2 py-0.5 text-label-sm text-tertiary">
        Full scholarship
      </span>
    </div>
  );
}

const STEPS = [
  {
    n: "1",
    title: "Answer a friendly questionnaire",
    body: "7 chapters, 22 questions — designed to feel like a conversation, not a form. Takes 4–6 minutes.",
    teaser: <ProgressTeaser />,
  },
  {
    n: "2",
    title: "Our AI finds your best matches",
    body: "We match your grades, goals, scholarships, and location preferences against thousands of universities worldwide.",
    teaser: <MatchingTeaser />,
  },
  {
    n: "3",
    title: "Receive a ranked, actionable list",
    body: "Universities sorted by scholarship match first, then fit. Each with a plain-English explanation of why it works for you.",
    teaser: <CardTeaser />,
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-surface-container-low px-4 py-20 sm:px-8 sm:py-28"
    >
      <div className="mx-auto max-w-[1100px]">
        <Reveal>
          <p className="text-label-md font-semibold uppercase text-primary">
            How it works
          </p>
          <h2 className="mt-3 max-w-[640px] text-display-lg-mobile text-on-background">
            From confused to confident in 4 minutes.
          </h2>
        </Reveal>

        {/* Connector line behind the row on desktop */}
        <div className="relative mt-14">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-4 hidden border-t border-dashed border-outline-variant md:block"
          />
          <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.n} delay={i * 0.15} y={40}>
                <div className="relative flex flex-col">
                  <span className="z-10 flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-label-md font-bold text-on-secondary-container">
                    {s.n}
                  </span>
                  <h3 className="mt-5 text-headline-sm text-on-surface">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-body-md text-on-surface-variant">
                    {s.body}
                  </p>
                  <div className="mt-5">{s.teaser}</div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-14 flex flex-col items-center gap-3">
            <CTAButton href={ONBOARDING_PATH} hoverScale={1.03}>
              Find my universities →
            </CTAButton>
            <p className="text-label-sm text-on-surface-variant">
              Free to start · No account required
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
