import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Seamless transitions: prefetch the destination chunk + loader on
    // hover/touchstart/focus so the route is warm before the click lands.
    defaultPreload: "intent",
    // Small delay so a mere pass-over doesn't fire a preload; a real intent does.
    defaultPreloadDelay: 50,
    // Cache preloaded route data so re-hovering the same link doesn't refetch.
    defaultPreloadStaleTime: 30_000,
    // Pending config: show pending state quickly, but never flash it. Only
    // applies to routes with a pendingComponent (pages keep their own skeletons).
    defaultPendingMs: 150,
    defaultPendingMinMs: 250,
  });

  return router;
};
