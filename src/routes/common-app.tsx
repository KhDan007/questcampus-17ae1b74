import { createFileRoute, Navigate } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { CommonAppProfile } from "@/components/apply/CommonAppProfile";
import { useAuth } from "@/lib/auth/useAuth";

type CommonAppSearch = { section?: string };

export const Route = createFileRoute("/common-app")({
  validateSearch: (search: Record<string, unknown>): CommonAppSearch => {
    const raw = search.section;
    return { section: typeof raw === "string" && raw.length > 0 ? raw : undefined };
  },
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
  const { section } = Route.useSearch();

  if (isHydrated && !isAuthenticated) {
    return <Navigate to="/signin" search={{ redirect: "/common-app" } as never} />;
  }

  return (
    <DashboardShell>
      <LivingBackground />
      <main
        id="main-content"
        className="relative mx-auto w-full max-w-(--container-content) px-5 pb-32 pt-20 sm:px-8 sm:pt-24 lg:px-12"
      >
        <CommonAppProfile focusSection={section} />
      </main>
    </DashboardShell>
  );
}
