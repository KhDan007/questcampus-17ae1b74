"use client";

import { QuestCampusLogo } from "@/components/brand/QuestCampusLogo";

export function FooterV2() {
  return (
    <footer className="relative border-t-2 border-on-surface/10 bg-surface px-5 py-12 sm:px-8">
      <div className="mx-auto flex max-w-(--container-content) flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="flex items-center">
          <QuestCampusLogo className="h-8" />
        </div>

        <nav className="flex flex-wrap items-center gap-x-7 gap-y-3 font-[var(--font-label)] text-label-md text-on-surface-variant">
          <a href="/#how" className="hover:text-on-surface">How it works</a>
          <a href="/#roadmap" className="hover:text-on-surface">Roadmap</a>
          <a href="/#waitlist" className="hover:text-on-surface">Waitlist</a>
          <a href="/signin" className="hover:text-on-surface">Sign in</a>
          <a href="/tos" className="hover:text-on-surface">Terms</a>
        </nav>

        <p className="font-[var(--font-label)] text-label-sm text-on-surface-variant">
          © {new Date().getFullYear()} QuestCampus. Built for ambitious students.
        </p>
      </div>
    </footer>
  );
}
