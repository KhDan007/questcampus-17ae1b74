import { createFileRoute } from "@tanstack/react-router";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { HeroOnboarding } from "@/components/landing2/HeroOnboarding";
import { ParallaxShowcase } from "@/components/landing2/ParallaxShowcase";
import { HowItWorks } from "@/components/landing2/HowItWorks";
import { RoadmapV2 } from "@/components/landing2/RoadmapV2";
import { WaitlistV2 } from "@/components/landing2/WaitlistV2";
import { FooterV2 } from "@/components/landing2/FooterV2";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuestCampus" },
      {
        name: "description",
        content:
          "Answer 5 questions. Get a personalized ranked list of universities — Safety, Target, Reach — with scholarships and deadlines. AI-matched in under a minute. Free to start, $15/month to unlock all 20.",
      },
      { property: "og:title", content: "QuestCampus — Find the universities that actually fit you" },
      {
        property: "og:description",
        content:
          "AI-matched university search for ambitious students. 11,000+ universities ranked to your real grades, goals, and budget. Free to start.",
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
        <WaitlistV2 />
      </main>
      <FooterV2 />
    </>
  );
}
