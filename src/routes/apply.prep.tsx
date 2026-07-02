import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { ApplyStepper } from "@/components/apply/ApplyStepper";
import { CollectWorkspace } from "@/components/apply/collect/CollectWorkspace";
import { useAuth } from "@/lib/auth/useAuth";

export const Route = createFileRoute("/apply/prep")({
  head: () => ({
    meta: [
      { title: "Prepare your applications — QuestCampus" },
      {
        name: "description",
        content: "We pull each university's real requirements and only ask what's needed.",
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
        className="relative mx-auto w-full max-w-(--container-content) px-5 pb-32 pt-28 sm:px-8 lg:px-12"
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

        <div className="mt-8">
          <CollectWorkspace />
        </div>
      </main>
    </DashboardShell>
  );
}
