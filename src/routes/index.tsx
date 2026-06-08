import { createFileRoute } from "@tanstack/react-router";
import { NavBar } from "@/components/landing/NavBar";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PricingSection } from "@/components/landing/PricingSection";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuestCampus — Find the university that wants YOU" },
      {
        name: "description",
        content:
          "Answer 22 questions. Get a ranked list of universities matched to your grades, goals, and scholarships — in minutes.",
      },
      { property: "og:title", content: "QuestCampus — Find the university that wants YOU" },
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
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
