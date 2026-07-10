// Preview sync heal: harmless no-op comment to re-linearize main HEAD.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { EmailVerifyGate } from "@/components/auth/EmailVerifyGate";
import { NavV2 } from "@/components/landing2/NavV2";
import { AssistantSidebar } from "@/components/chat/AssistantSidebar";
import { ChatDockProvider } from "@/lib/chat/ChatDock";
import { LangSync } from "@/lib/i18n/LangSync";
import { useAuth } from "@/lib/auth/useAuth";

// Core workspace routes to warm up after first paint for signed-in users, so
// sidebar navigation is instant even without a hover to trigger intent preload.
const WARMUP_ROUTES = [
  "/dashboard",
  "/universities",
  "/plan",
  "/apply",
  "/essay",
  "/common-app",
  "/agent",
  "/documents",
] as const;


import appCss from "../styles.css?url";
import ogImageAsset from "@/assets/questcampus-og.jpg.asset.json";
import { assetUrl } from "@/lib/assets";
import { reportLovableError } from "../lib/lovable-error-reporting";

const OG_IMAGE_URL = assetUrl(ogImageAsset);

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn&apos;t load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "QuestCampus" },
      {
        name: "description",
        content:
          "Answer a few questions. Get a personalized list of universities that match your grades, goals, and scholarship needs — in minutes.",
      },
      { property: "og:title", content: "QuestCampus" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "QuestCampus" },
      { property: "og:description", content: "Search 11,000+ universities, get an AI-matched shortlist, and build every application from one workspace." },
      { name: "twitter:description", content: "Search 11,000+ universities, get an AI-matched shortlist, and build every application from one workspace." },
      { property: "og:image", content: OG_IMAGE_URL },
      { name: "twitter:image", content: OG_IMAGE_URL },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/favicon.ico" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Epilogue:wght@500;600;700;800&family=Be+Vietnam+Pro:wght@400;500;600;700&family=Geist:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.classList.remove('dark')}catch(e){}" }} />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <RouteProgressBar />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Instant, subtle navigation feedback: a 2px brand-primary bar fixed to the top
 * of the viewport. Driven by the router's overall status ("pending" during a
 * navigation while the destination chunk/loader resolves, "idle" otherwise).
 * The router's defaultPendingMs/MinMs keep the transition from flashing on fast
 * navigations. Respects prefers-reduced-motion (opacity instead of width anim).
 */
function RouteProgressBar() {
  const isNavigating = useRouterState({ select: (s) => s.status === "pending" });

  // Single markup path (no useReducedMotion JS branch) so SSR and first client
  // render are identical — the branch read matchMedia on the client only and
  // caused a hydration mismatch. Reduced-motion users get opacity-only via the
  // Tailwind motion-reduce variant; width still snaps but never animates.
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5">
      <div
        className="h-full bg-primary ease-out motion-safe:transition-[width,opacity] motion-reduce:transition-opacity"
        style={{
          width: isNavigating ? "90%" : "100%",
          opacity: isNavigating ? 1 : 0,
          transitionDuration: isNavigating ? "800ms" : "250ms",
        }}
      />
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuth();

  // Idle warm-up: once a signed-in user's first paint is done, preload the core
  // workspace route chunks during idle time so sidebar navigation is already
  // warm even without a hover. SSR-guarded and fires once per session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isHydrated || !isAuthenticated) return;

    let done = false;
    const warm = () => {
      if (done) return;
      done = true;
      for (const to of WARMUP_ROUTES) {
        // Fire-and-forget; failures (e.g. a route mid-refactor) are non-fatal.
        void router.preloadRoute({ to }).catch(() => {});
      }
    };

    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    if (typeof ric === "function") {
      const id = ric(warm, { timeout: 3000 });
      return () => {
        const cic = (window as unknown as {
          cancelIdleCallback?: (id: number) => void;
        }).cancelIdleCallback;
        cic?.(id);
      };
    }
    const t = window.setTimeout(warm, 1500);
    return () => window.clearTimeout(t);
  }, [router, isAuthenticated, isHydrated]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConvexClientProvider>
        <I18nProvider>
          <ChatDockProvider>
            {/* The docked chat shifts page content via a body padding-right keyed
                on --chat-dock-w (see styles.css); the panel is a real sidebar,
                not an overlay, on desktop. */}
            <NavV2 />
            <RouteTransitions>
              <Outlet />
            </RouteTransitions>
            <EmailVerifyGate />
            <LangSync />
            <AssistantSidebar />
          </ChatDockProvider>
        </I18nProvider>
      </ConvexClientProvider>
    </QueryClientProvider>
  );
}

function RouteTransitions({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  // Key on the top-level route segment so in-page state (search params, hashes,
  // nested updates) doesn't trigger a fade. Only true route changes animate.
  const segment = useRouterState({
    select: (s) => "/" + (s.location.pathname.split("/")[1] ?? ""),
  });
  if (reduce) return <>{children}</>;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={segment}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
