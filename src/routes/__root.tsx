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

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

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
      { title: "QuestCampus — Find universities that want someone like you" },
      {
        name: "description",
        content:
          "Answer a few questions. Get a personalized list of universities that match your grades, goals, and scholarship needs — in minutes.",
      },
      { property: "og:title", content: "QuestCampus — Find universities that want someone like you" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "QuestCampus — Find universities that want someone like you" },
      { name: "description", content: "QuestCampus front is a web application for user onboarding and authentication." },
      { property: "og:description", content: "QuestCampus front is a web application for user onboarding and authentication." },
      { name: "twitter:description", content: "QuestCampus front is a web application for user onboarding and authentication." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/aec448e7-0839-42f5-8bbb-53aae96b8cc6/id-preview-608e99aa--a2be596c-1a32-48dd-b3dc-34e3242da808.lovable.app-1780666475149.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/aec448e7-0839-42f5-8bbb-53aae96b8cc6/id-preview-608e99aa--a2be596c-1a32-48dd-b3dc-34e3242da808.lovable.app-1780666475149.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
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
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    // Capture ?ref=... into localStorage so it survives the OAuth round-trip.
    // Lazy import keeps SSR clean — the helper is a no-op on the server anyway.
    import("@/lib/referral/client").then(({ captureRef }) => captureRef());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ConvexClientProvider>
        <I18nProvider>
          <RouteTransitions>
            <Outlet />
          </RouteTransitions>
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
