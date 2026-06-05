import { CTAButton } from "./CTAButton";
import { Reveal } from "./Reveal";
import { ONBOARDING_PATH } from "@/lib/routes";
import { STUDENTS_STARTED } from "@/lib/config";

// Last-chance conversion. Warm readers — close them.
export function FinalCTA() {
  return (
    <section className="relative isolate overflow-hidden px-4 py-20 sm:px-8">
      {/* Animated diagonal shimmer gradient — subtle 4s loop. */}
      <div
        aria-hidden
        className="animate-shimmer absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(115deg, #3525cd 0%, #4f46e5 50%, #3525cd 100%)",
        }}
      />
      <div className="mx-auto flex min-h-[240px] max-w-[740px] flex-col items-center justify-center text-center">
        <Reveal y={24}>
          <h2 className="text-display-lg-mobile text-white sm:text-display-lg">
            Your university list is waiting.
          </h2>
          <p className="mt-3 text-body-lg text-white/80">
            4 minutes. Free to start. No credit card required.
          </p>
        </Reveal>
        <Reveal delay={0.12} y={24}>
          <div className="mt-8 flex flex-col items-center gap-3">
            <CTAButton href={ONBOARDING_PATH} variant="white" hoverScale={1.03}>
              Find my universities →
            </CTAButton>
            <p className="text-label-sm text-white/60">
              Join {STUDENTS_STARTED} students who&apos;ve already started
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
