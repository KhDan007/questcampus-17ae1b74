import { CTAButton } from "./CTAButton";
import { Reveal } from "./Reveal";
import { ONBOARDING_PATH } from "@/lib/routes";

// Above the fold. Centered single column, pure typographic impact, no imagery.
export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-surface px-4 pb-20 pt-32 sm:px-8 sm:pt-40">
      {/* Ambient blobs — CSS keyframes only, play once on load. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="animate-blob-in absolute left-1/2 top-1/3 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
          style={{ background: "rgba(79,70,229,0.06)" }}
        />
        <div
          className="animate-blob-in absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full blur-[120px]"
          style={{ background: "rgba(254,166,25,0.04)", animationDelay: "120ms" }}
        />
        <div
          className="animate-blob-in absolute right-0 top-0 h-[360px] w-[360px] rounded-full blur-[120px]"
          style={{ background: "rgba(254,166,25,0.04)", animationDelay: "120ms" }}
        />
      </div>

      <div className="mx-auto flex max-w-[740px] flex-col items-center text-center">
        <Reveal onMount delay={0} duration={0.4} y={16}>
          <span className="inline-block rounded-full bg-primary-fixed px-3 py-1 text-label-sm font-medium uppercase text-primary">
            AI-Powered University Matching
          </span>
        </Reveal>

        <Reveal onMount delay={0.08} y={16}>
          <h1 className="mt-6 text-display-lg-mobile text-on-background sm:text-display-lg">
            Find universities that{" "}
            <span className="bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent">
              want someone like you.
            </span>
          </h1>
        </Reveal>

        <Reveal onMount delay={0.16} y={16}>
          <p className="mx-auto mt-5 max-w-[560px] text-body-lg leading-relaxed text-on-surface-variant">
            Answer a few questions. Get a personalized list of universities that
            match your grades, goals, and scholarship needs — in minutes.
          </p>
        </Reveal>

        <Reveal onMount delay={0.24} y={16}>
          <div className="mt-9 flex flex-col items-center gap-3">
            <CTAButton href={ONBOARDING_PATH} hoverScale={1.03}>
              Find my universities →
            </CTAButton>
            <p className="text-label-sm text-on-surface-variant">
              Takes 4–6 minutes · No account required to start
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
