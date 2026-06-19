import { createFileRoute } from "@tanstack/react-router";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { HeroOnboarding } from "@/components/landing2/HeroOnboarding";
import { ParallaxShowcase } from "@/components/landing2/ParallaxShowcase";
import { HowItWorks } from "@/components/landing2/HowItWorks";
import { RoadmapV2 } from "@/components/landing2/RoadmapV2";
import { WaitlistV2 } from "@/components/landing2/WaitlistV2";
import { MidPageCTA } from "@/components/landing2/MidPageCTA";
import { FooterV2 } from "@/components/landing2/FooterV2";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuestCampus — Your entire admissions journey, in one place" },
      {
        name: "description",
        content:
          "Search, shortlist, match, and apply to universities worldwide from a single workspace. Built for international and domestic applicants — start free.",
      },
      {
        property: "og:title",
        content: "QuestCampus — Your entire admissions journey, in one place",
      },
      {
        property: "og:description",
        content:
          "Search 11,000+ universities, get AI-matched shortlists, build applications, and (soon) auto-apply — all in one workspace.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <>
      <LivingBackground />
      <main id="main-content" className="relative">
        <HeroOnboarding />
        <ParallaxShowcase />
        <HowItWorks />
        <RoadmapV2 />
        <MidPageCTA />
        <WaitlistV2 />
      </main>
      <FooterV2 />
    </>
  );
}
