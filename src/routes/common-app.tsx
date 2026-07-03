import { createFileRoute, Navigate } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { CommonAppProfile } from "@/components/apply/CommonAppProfile";
import { useAuth } from "@/lib/auth/useAuth";

export const Route = createFileRoute("/common-app")({
  head: () => ({
    meta: [
      { title: "Common App Profile — QuestCampus" },
      {
        name: "description",
        content:
          "Fill your Common App profile once — we auto-fill it into every Common App school.",
      },
    ],
  }),
  component: CommonAppProfilePage,
});

function CommonAppProfilePage() {
  // NOTE: all hooks BEFORE any auth guard — Rules of Hooks.
  const { isAuthenticated, isHydrated } = useAuth();

  if (isHydrated && !isAuthenticated) {
    return <Navigate to="/signin" search={{ redirect: "/common-app" } as never} />;
  }

  return (
    <DashboardShell>
      <LivingBackground />
      <main
        id="main-content"
        className="relative mx-auto w-full max-w-(--container-content) px-5 pb-32 pt-24 sm:px-8 lg:px-12"
      >
        <CommonAppProfile />
      </main>
    </DashboardShell>
  );
}
