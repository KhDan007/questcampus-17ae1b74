"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Bookmark, GraduationCap, MapPin, Search, Trash2, Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useSavedUniversities, type SavedUniversity } from "@/lib/universities/savedClient";
import { SaveToggle } from "@/components/universities/SaveToggle";
import type { UniversitySearchResult } from "@/routes/universities";

function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function MyUniversitiesSection() {
  const reduce = useReducedMotion();
  const { saved, isAuthenticated, isSaved, requireAuth, addFromSearch, removeById, removeByUniversity } =
    useSavedUniversities();
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim(), 250);
  const canSearch = debounced.length >= 2;
  const results = useQuery(
    api.universitySearch.search,
    canSearch ? { query: debounced, limit: 10 } : "skip",
  ) as UniversitySearchResult[] | undefined;

  if (!isAuthenticated) {
    return (
      <section className="mt-14">
        <h2 className="font-display text-headline-lg font-bold text-on-surface">My universities</h2>
        <div className="mt-4 rounded-2xl border-2 border-dashed border-on-surface/25 bg-surface/60 p-6 backdrop-blur-sm">
          <p className="text-body-md text-on-surface-variant">
            Sign in to build your shortlist —{" "}
            <Link to="/signin" className="text-primary underline">create a free account</Link> and
            add schools from search or your AI matches.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-14">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-headline-lg font-bold text-on-surface">My universities</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Your saved shortlist — add from search or from your matches.
          </p>
        </div>
        <Link
          to="/universities"
          className="hidden shrink-0 items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-3 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none sm:inline-flex"
        >
          Open full search →
        </Link>
      </div>

      {/* Inline search */}
      <div className="mt-5 flex items-center gap-2 rounded-md border-2 border-on-surface bg-surface px-3 qc-hard-shadow-sm focus-within:-translate-y-0.5 focus-within:translate-x-0.5 focus-within:shadow-none">
        <Search className="h-4 w-4 text-on-surface/60" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search universities to add…"
          className="h-12 w-full bg-transparent text-body-md text-on-surface placeholder:text-on-surface/40 focus:outline-none"
        />
      </div>

      {canSearch && (
        <div className="mt-3">
          {results === undefined ? (
            <p className="px-1 text-body-sm text-on-surface-variant">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-1 text-body-sm text-on-surface-variant">
              No matching universities found. Try a shorter name.
            </p>
          ) : (
            <ul className="grid gap-2">
              {results.map((r) => {
                const isSavedRow = isSaved(r.source, r.externalId);
                return (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 rounded-lg border border-on-surface/15 bg-surface/95 p-3"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-on-surface/20 bg-secondary-container">
                      <GraduationCap className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-label-lg font-bold text-on-surface">
                        {r.name}
                      </p>
                      <p className="truncate font-[var(--font-label)] text-label-sm text-on-surface-variant">
                        {[r.city, r.state, r.country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                    <SaveToggle
                      variant="icon"
                      saved={isSavedRow}
                      onAdd={async () => {
                        if (!requireAuth()) return;
                        await addFromSearch(r.id);
                      }}
                      onRemove={async () => {
                        await removeByUniversity(r.source, r.externalId);
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Saved list */}
      <div className="mt-7">
        {saved === undefined ? (
          <div className="flex items-center gap-2 rounded-xl border-2 border-on-surface bg-surface/85 p-5 qc-hard-shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-on-surface/60" />
            <span className="text-body-md text-on-surface-variant">Loading your list…</span>
          </div>
        ) : saved.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-on-surface/25 bg-surface/60 p-8 text-center backdrop-blur-sm">
            <Bookmark className="mx-auto h-6 w-6 text-on-surface/40" />
            <p className="mt-3 text-body-lg text-on-surface-variant">
              Search for universities you already know, or add schools from your matches.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {saved.map((u, i) => (
              <SavedRow
                key={u.id}
                u={u}
                index={i}
                reduce={!!reduce}
                onRemove={() => removeById(u.id)}
              />
            ))}
          </ul>
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
      className="flex items-start gap-3 rounded-xl border-2 border-on-surface bg-surface/95 p-4 qc-hard-shadow-sm"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border-2 border-on-surface bg-secondary-container">
        <GraduationCap className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-headline-sm font-bold text-on-surface">
          {u.name}
        </p>
        {location && (
          <p className="mt-0.5 inline-flex items-center gap-1 font-[var(--font-label)] text-label-sm text-on-surface-variant">
            <MapPin className="h-3.5 w-3.5" /> {location}
          </p>
        )}
        <p className="mt-1 font-[var(--font-label)] text-label-sm uppercase tracking-wider text-on-surface-variant">
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
