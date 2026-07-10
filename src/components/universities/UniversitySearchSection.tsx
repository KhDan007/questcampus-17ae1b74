"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { Search, GraduationCap, Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useSavedUniversities } from "@/lib/universities/savedClient";
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

type Props = {
  title?: string;
  subtitle?: string;
  placeholder?: string;
  limit?: number;
};

export function UniversitySearchSection({
  title = "Search universities",
  subtitle = "Search 11,000+ universities and add the ones you're already considering.",
  placeholder = "e.g. Stanford, ETH, Sciences Po…",
  limit = 10,
}: Props) {
  const { isSaved, requireAuth, addFromSearch, removeByUniversity } =
    useSavedUniversities();
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim(), 250);
  const canSearch = debounced.length >= 2;

  const results = useQuery(
    api.universitySearch.search,
    canSearch ? { query: debounced, limit } : "skip",
  ) as UniversitySearchResult[] | undefined;

  return (
    <section>
      <div>
        <h2 className="font-display text-headline-sm font-bold text-on-surface sm:text-headline-lg">
          {title}
        </h2>
        <p className="mt-1 text-body-md text-on-surface-variant">{subtitle}</p>
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-md border-2 border-on-surface bg-surface px-3 qc-hard-shadow-sm focus-within:-translate-y-0.5 focus-within:translate-x-0.5 focus-within:shadow-none">
        <Search className="h-4 w-4 text-on-surface/60" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="h-12 w-full bg-transparent text-body-md text-on-surface placeholder:text-on-surface/40 focus:outline-none"
        />
      </div>

      {canSearch && (
        <div className="mt-3">
          {results === undefined ? (
            <p className="flex items-center gap-2 px-1 text-body-sm text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </p>
          ) : results.length === 0 ? (
            <p className="px-1 text-body-sm text-on-surface-variant">
              No matching universities found. Try a shorter name.
            </p>
          ) : (
            <ul className="grid gap-2">
              {results.map((r) => {
                const saved = isSaved(r.source, r.externalId);
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
                      saved={saved}
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
    </section>
  );
}
