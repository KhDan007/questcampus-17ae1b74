"use client";

import { ONBOARDING_PATH, SIGNIN_PATH, WAITLIST_PATH } from "@/lib/routes";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function Footer() {
  const { t } = useI18n();
  const links = [
    { key: "footer.link.how", href: "#how-it-works" },
    { key: "footer.link.pricing", href: "#pricing" },
    { key: "footer.link.waitlist", href: WAITLIST_PATH },
    { key: "footer.link.signin", href: SIGNIN_PATH },
  ];

  return (
    <footer className="bg-surface px-4 py-14 sm:px-8">
      <div className="mx-auto max-w-(--container-content)">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <a
              href={ONBOARDING_PATH}
              className="font-display text-xl font-bold text-primary"
            >
              QuestCampus
            </a>
            <p className="mt-3 max-w-[280px] text-body-md text-on-surface-variant">
              {t("footer.tagline")}
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-col gap-2">
            {links.map((l) => (
              <a
                key={l.key}
                href={l.href}
                className="text-body-md text-on-surface-variant transition-colors hover:text-on-surface"
              >
                {t(l.key)}
              </a>
            ))}
          </nav>

          <p className="text-body-md text-on-surface-variant md:text-right">
            {t("footer.made")}
          </p>
        </div>

        <div className="mt-10 border-t border-outline-variant pt-6">
          <p className="text-label-sm text-on-surface-variant">
            {t("footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
