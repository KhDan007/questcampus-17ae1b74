import { Link } from "@tanstack/react-router";
import { ONBOARDING_PATH, SIGNIN_PATH, WAITLIST_PATH } from "@/lib/routes";

const LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Waitlist", href: WAITLIST_PATH },
  { label: "Sign in", href: SIGNIN_PATH },
];

export function Footer() {
  return (
    <footer className="bg-surface px-4 py-14 sm:px-8">
      <div className="mx-auto max-w-(--container-content)">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Link
              to={ONBOARDING_PATH}
              className="font-display text-xl font-bold text-primary"
            >
              QuestCampus
            </Link>
            <p className="mt-3 max-w-[280px] text-body-md text-on-surface-variant">
              The university search tool you deserved from the start.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-col gap-2">
            {LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.href}
                className="text-body-md text-on-surface-variant transition-colors hover:text-on-surface"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <p className="text-body-md text-on-surface-variant md:text-right">
            Made for international students everywhere.
          </p>
        </div>

        <div className="mt-10 border-t border-outline-variant pt-6">
          <p className="text-label-sm text-on-surface-variant">
            © 2026 QuestCampus · Privacy · Terms
          </p>
        </div>
      </div>
    </footer>
  );
}
