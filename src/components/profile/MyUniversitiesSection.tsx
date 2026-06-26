"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  Bookmark,
  GraduationCap,
  MapPin,
  Trash2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import {
  useSavedUniversities,
  type SavedUniversity,
} from "@/lib/universities/savedClient";

const PREVIEW_COUNT = 5;

export function MyUniversitiesSection() {
  const reduce = useReducedMotion();
  const { saved, isAuthenticated, removeById } = useSavedUniversities();

  if (!isAuthenticated) {
    return (
      <section className="mt-14">
        <h2 className="font-display text-headline-lg font-bold text-on-surface">
          My universities
        </h2>
        <div className="mt-4 rounded-2xl border-2 border-dashed border-on-surface/25 bg-surface/60 p-6 backdrop-blur-sm">
          <p className="text-body-md text-on-surface-variant">
            Sign in to build your shortlist —{" "}
            <Link to="/signin" className="text-primary underline">
              create a free account
            </Link>{" "}
            and add schools from search or your AI matches.
          </p>
        </div>
      </section>
    );
  }

  const list = saved ?? [];
  const preview = list.slice(0, PREVIEW_COUNT);
  const remaining = Math.max(0, list.length - PREVIEW_COUNT);

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-headline-lg font-bold text-on-surface">
            My universities
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {list.length === 0
              ? "Your saved shortlist will appear here."
              : `${list.length} saved · preview of your shortlist.`}
          </p>
        </div>
        <Link
          to="/universities"
          search={{ q: "" }}
          className="inline-flex shrink-0 items-center gap-2 rounded-md border-2 border-on-surface bg-surface px-3 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
        >
          Manage universities <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-6">
        {saved === undefined ? (
          <div className="flex items-center gap-2 rounded-xl border-2 border-on-surface bg-surface/85 p-5 qc-hard-shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-on-surface/60" />
            <span className="text-body-md text-on-surface-variant">
              Loading your list…
            </span>
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-on-surface/25 bg-surface/60 p-8 text-center backdrop-blur-sm">
            <Bookmark className="mx-auto h-6 w-6 text-on-surface/40" />
            <p className="mt-3 text-body-lg text-on-surface-variant">
              Search for universities you already know, or save schools from
              your matches.
            </p>
            <Link
              to="/universities"
              search={{ q: "" }}
              className="mt-5 inline-flex items-center gap-2 rounded-md border-2 border-on-surface bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-white qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
            >
              Open universities <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-2">
              {preview.map((u, i) => (
                <SavedRow
                  key={u.id}
                  u={u}
                  index={i}
                  reduce={!!reduce}
                  onRemove={() => removeById(u.id)}
                />
              ))}
            </ul>
            {remaining > 0 && (
              <Link
                to="/universities"
                search={{ q: "" }}
                className="mt-4 inline-flex items-center gap-1.5 text-label-md font-semibold text-primary hover:underline"
              >
                + {remaining} more — manage all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function SavedRow({
  u,
  index,
  reduce,
  onRemove,
}: {
  u: SavedUniversity;
  index: number;
  reduce: boolean;
  onRemove: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const location = [u.city, u.state, u.country].filter(Boolean).join(", ");
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 6) * 0.04 }}
      className="flex min-w-0 items-start gap-3 overflow-hidden rounded-xl border-2 border-on-surface bg-surface/95 p-4 qc-hard-shadow-sm"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border-2 border-on-surface bg-secondary-container">
        <GraduationCap className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-headline-sm font-bold text-on-surface">
          {u.name}
        </p>
        {location && (
          <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate font-[var(--font-label)] text-label-sm text-on-surface-variant">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{location}</span>
          </p>
        )}
        <p className="mt-1 truncate font-[var(--font-label)] text-label-sm uppercase tracking-wider text-on-surface-variant">
          Added from {u.origin}
        </p>
      </div>
      <button
        type="button"
        aria-label="Remove from My universities"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onRemove();
          } finally {
            setBusy(false);
          }
        }}
        className="grid h-9 w-9 place-items-center rounded-md border-2 border-on-surface bg-surface text-on-surface qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </motion.li>
  );
}
