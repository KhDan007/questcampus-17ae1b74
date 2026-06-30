import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { ApplyStepper } from "@/components/apply/ApplyStepper";
import { PrepWizard } from "@/components/apply/PrepWizard";
import { useAuth } from "@/lib/auth/useAuth";

export const Route = createFileRoute("/apply/prep")({
  head: () => ({
    meta: [
      { title: "Prepare your applications — QuestCampus" },
      {
        name: "description",
        content: "Answer a few quick questions, upload your documents, and we'll handle the rest.",
      },
    ],
  }),
  component: PrepPage,
});

function PrepPage() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated)
    return <Navigate to="/signin" search={{ redirect: "/apply/prep" } as never} />;

  return (
    <DashboardShell>
      <LivingBackground />
      <main
        id="main-content"
        className="relative mx-auto w-full max-w-(--container-content) px-5 pb-24 pt-28 sm:px-8 lg:px-12"
      >
        <Link
          to="/apply"
          className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-md text-on-surface/70 hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4" /> Back to apply
        </Link>

        <div className="mt-6">
          <ApplyStepper current="prep" />
        </div>

        <header className="mx-auto mt-8 max-w-2xl text-center">
          <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
            Prep
          </p>
          <h1 className="mt-2 font-display text-display-sm text-on-surface">
            One question at a time.
          </h1>
          <p className="mt-2 text-body-lg text-on-surface-variant">
            Quick, calm, and reused for every application after this.
          </p>
        </header>

        <div className="mt-10">
          <PrepWizard />
        </div>
      </main>
    </DashboardShell>
  );
}
