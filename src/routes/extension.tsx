import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Chrome, Download, ExternalLink, MousePointerClick, ShieldCheck } from "lucide-react";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useExtensionInstalled } from "@/lib/extension/detect";

type ExtensionSearch = { system?: string; externalId?: string };

export const Route = createFileRoute("/extension")({
  validateSearch: (search: Record<string, unknown>): ExtensionSearch => ({
    system: typeof search.system === "string" ? search.system : undefined,
    externalId: typeof search.externalId === "string" ? search.externalId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Get the extension — QuestCampus" },
      {
        name: "description",
        content: "Install the QuestCampus browser extension to auto-apply from your own logged-in session.",
      },
    ],
  }),
  component: ExtensionPage,
});

const EXTENSION_ZIP = "/questcampus-extension.zip";

const STEPS = [
  {
    Icon: Chrome,
    title: "Add it to Chrome",
    body: "Unzip the download, open chrome://extensions, switch on Developer mode (top right), click \"Load unpacked\", and pick the questcampus-extension folder. Pin it from the puzzle-piece menu.",
  },
  {
    Icon: ShieldCheck,
    title: "Sign into each portal yourself",
    body: "The extension never stores or reuses your application-portal passwords. Log into Common App or a school's own portal the normal way, in your own browser.",
  },
  {
    Icon: MousePointerClick,
    title: "Let it fill from your QuestCampus answers",
    body: "Open the extension's side panel on the portal page. It reads your saved profile and documents and fills the form for you — you review and submit.",
  },
];

function ExtensionPage() {
  const { installed, checked } = useExtensionInstalled();
  const { system, externalId } = Route.useSearch();
  const targetHref =
    system && externalId ? `/application/${system}/${externalId}` : "/apply";

  return (
    <DashboardShell>
      <LivingBackground />
      <main
        id="main-content"
        className="relative mx-auto w-full max-w-(--container-content) px-5 pb-24 pt-24 sm:px-8 lg:px-12"
      >
        <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
          Auto-apply
        </p>
        <h1 className="mt-1.5 text-display-lg-mobile text-on-surface sm:text-display-lg text-balance">
          Applying happens in your own browser.
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg text-on-surface-variant">
          QuestCampus doesn't submit applications for you from a server. The browser extension
          fills each portal using your own active session — nothing runs, and nothing gets
          submitted, without you watching.
        </p>

        {checked && (
          <div
            className={`mt-6 inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 font-[var(--font-label)] text-label-md font-semibold ${
              installed
                ? "border-tertiary/50 bg-tertiary/10 text-on-surface"
                : "border-on-surface/25 bg-surface text-on-surface-variant"
            }`}
          >
            {installed ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-tertiary" /> Extension detected on this browser
              </>
            ) : (
              <>Extension not detected on this browser yet</>
            )}
          </div>
        )}

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border-2 border-on-surface bg-surface p-5 qc-hard-shadow-sm"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl border-2 border-on-surface bg-secondary-container text-on-surface">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-display text-headline-sm font-bold text-on-surface">
                {title}
              </h2>
              <p className="mt-1.5 text-body-sm text-on-surface-variant">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          {!installed && (
            <a
              href={EXTENSION_ZIP}
              download
              className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
            >
              <Download className="h-4 w-4" /> Download the extension
            </a>
          )}
          <Link
            to={targetHref}
            className={`inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none ${
              installed ? "bg-primary text-white" : "bg-surface text-on-surface"
            }`}
          >
            {installed ? "Continue to your application" : "Back to applications"}
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-3 text-label-sm text-on-surface-variant">
          Chrome Web Store listing is on its way — until then this direct install is the beta channel.
        </p>
      </main>
    </DashboardShell>
  );
}
