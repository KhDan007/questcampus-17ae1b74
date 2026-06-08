"use client";

import { Link } from "@tanstack/react-router";
import { SIGNIN_PATH, WAITLIST_PATH } from "@/lib/routes";
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
    <footer className="bg-cream px-6 sm:px-12" style={{ borderTop: "2px solid #111111", paddingTop: 56, paddingBottom: 32 }}>
      <div className="mx-auto max-w-(--container-content)">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Link to="/" className="font-display text-ink" style={{ fontWeight: 700, fontSize: 20 }}>
              QUESTCAMPUS
            </Link>
            <p className="mt-3 max-w-[280px] font-body text-ink-muted" style={{ fontSize: 14 }}>
              {t("footer.tagline")}
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-col gap-2">
            {links.map((l) =>
              l.href.startsWith("#") ? (
                <a key={l.key} href={l.href} className="font-body text-ink hover:underline" style={{ fontSize: 14 }}>
                  {t(l.key)}
                </a>
              ) : (
                <Link key={l.key} to={l.href} className="font-body text-ink hover:underline" style={{ fontSize: 14 }}>
                  {t(l.key)}
                </Link>
              ),
            )}
          </nav>

          <p className="font-body text-ink-muted md:text-right" style={{ fontSize: 14 }}>
            {t("footer.made")}
          </p>
        </div>

        <div className="mt-10 pt-6" style={{ borderTop: "2px solid #111111" }}>
          <p className="font-body text-ink-muted" style={{ fontSize: 12 }}>
            {t("footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
