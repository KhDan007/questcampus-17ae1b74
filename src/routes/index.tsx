import { createFileRoute } from "@tanstack/react-router";
import { NavBar } from "@/components/landing/NavBar";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PricingSection } from "@/components/landing/PricingSection";
import { RoadmapSection } from "@/components/landing/RoadmapSection";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuestCampus — Find universities that want someone like you" },
      {
        name: "description",
        content:
          "Answer a few questions. Get a personalized list of universities that match your grades, goals, and scholarship needs — in minutes. No account required to start.",
      },
      { property: "og:title", content: "QuestCampus — Find universities that want someone like you" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <HeroSection />
        <ProblemSection />
        <HowItWorks />
        <PricingSection />
        <RoadmapSection />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
