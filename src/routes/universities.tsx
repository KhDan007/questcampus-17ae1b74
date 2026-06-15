import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "convex/react";
import { Search, MapPin, ArrowLeft, GraduationCap } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { SaveToggle } from "@/components/universities/SaveToggle";
import { useSavedUniversities } from "@/lib/universities/savedClient";

export const Route = createFileRoute("/universities")({
  head: () => ({
    meta: [
      { title: "Search universities — QuestCampus" },
      {
        name: "description",
        content:
          "Already have schools in mind? Search 11,000+ universities and build your list.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
    country: typeof s.country === "string" ? s.country : "",
    region: typeof s.region === "string" ? s.region : "",
  }),
  component: UniversitiesPage,
});

export type UniversitySearchResult = {
  id: string;
  source: string;
  externalId: string;
  name: string;
  city?: string;
  state?: string;
  country: string;
  region?: string;
  website?: string;
  fields?: string[];
  globalRank?: number;
  acceptanceRate?: number;
  sizeBucket?: string;
};

function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

function UniversitiesPage() {
  const reduce = useReducedMotion();
  const initial = Route.useSearch();
  const navigate = Route.useNavigate();
  const [query, setQuery] = useState(initial.q);
  const [country, setCountry] = useState(initial.country);
  const [region, setRegion] = useState(initial.region);

  const debouncedQuery = useDebounced(query.trim(), 250);
  const canSearch = debouncedQuery.length >= 2;

  // Keep URL in sync (shallow) so signin redirect can restore state.
  useEffect(() => {
    void navigate({
      search: { q: query, country, region },
      replace: true,
    });
  }, [query, country, region, navigate]);

  const results = useQuery(
    api.universitySearch.search,
    canSearch
      ? {
          query: debouncedQuery,
          country: country || undefined,
          region: region || undefined,
          limit: 10,
        }
      : "skip",
  ) as UniversitySearchResult[] | undefined;

  const { saved } = useSavedUniversities();

  return (
    <>
      <LivingBackground />
      <main
        id="main-content"
        className="relative mx-auto w-full max-w-(--container-content) px-5 pb-24 pt-28 sm:px-8 lg:px-12"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-md text-on-surface/70 hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>

        <motion.header
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4"
        >
          <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
            Search universities
          </p>
          <h1 className="mt-2 font-display text-display-md text-on-surface">
            Already have schools in mind?
          </h1>
          <p className="mt-2 max-w-2xl text-body-lg text-on-surface-variant">
            Search the catalogue and add the ones you want to track to your list.
          </p>
        </motion.header>

        <section className="mt-8 rounded-2xl border-2 border-on-surface bg-surface/85 p-5 backdrop-blur-md qc-hard-shadow sm:p-6">
          <label className="block">
            <span className="font-[var(--font-label)] text-label-sm uppercase tracking-wider text-on-surface-variant">
              University name
            </span>
            <div className="mt-2 flex items-center gap-2 rounded-md border-2 border-on-surface bg-surface px-3 qc-hard-shadow-sm focus-within:-translate-y-0.5 focus-within:translate-x-0.5 focus-within:shadow-none">
              <Search className="h-4 w-4 text-on-surface/60" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Stanford, ETH, Sciences Po…"
                autoFocus
                className="h-12 w-full bg-transparent text-body-lg text-on-surface placeholder:text-on-surface/40 focus:outline-none"
              />
            </div>
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-[var(--font-label)] text-label-sm uppercase tracking-wider text-on-surface-variant">
                Country (optional)
              </span>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. United States"
                className="mt-2 h-11 w-full rounded-md border-2 border-on-surface bg-surface px-3 text-body-md text-on-surface qc-hard-shadow-sm focus:-translate-y-0.5 focus:translate-x-0.5 focus:shadow-none focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="font-[var(--font-label)] text-label-sm uppercase tracking-wider text-on-surface-variant">
                Region (optional)
              </span>
              <input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. Europe, Asia"
                className="mt-2 h-11 w-full rounded-md border-2 border-on-surface bg-surface px-3 text-body-md text-on-surface qc-hard-shadow-sm focus:-translate-y-0.5 focus:translate-x-0.5 focus:shadow-none focus:outline-none"
              />
            </label>
          </div>
        </section>

        <section className="mt-8">
          {!canSearch ? (
            <EmptyHint>
              Type at least 2 characters to search 11,000+ universities.
            </EmptyHint>
          ) : results === undefined ? (
            <LoadingHint />
          ) : results.length === 0 ? (
            <EmptyHint>No matching universities found. Try a shorter name.</EmptyHint>
          ) : (
            <ul className="grid gap-3">
              {results.map((r, i) => (
                <SearchRow key={r.id} result={r} index={i} reduce={!!reduce} />
              ))}
            </ul>
          )}
        </section>

        {saved && saved.length > 0 && (
          <p className="mt-10 text-center font-[var(--font-label)] text-label-md text-on-surface-variant">
            You have {saved.length} school{saved.length === 1 ? "" : "s"} on{" "}
            <Link to="/profile" className="text-primary underline">
              your list
            </Link>
            .
          </p>
        )}
      </main>
    </>
  );
}

function SearchRow({
  result,
  index,
  reduce,
}: {
  result: UniversitySearchResult;
  index: number;
  reduce: boolean;
}) {
  const { isSaved, isAuthenticated, requireAuth, addFromSearch, removeByUniversity } =
    useSavedUniversities();
  const saved = isSaved(result.source, result.externalId);
  const location = useMemo(
    () => [result.city, result.state, result.country].filter(Boolean).join(", "),
    [result],
  );

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 6) * 0.04 }}
      className="flex items-center gap-3 rounded-xl border-2 border-on-surface bg-surface/95 p-4 qc-hard-shadow-sm"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border-2 border-on-surface bg-secondary-container text-on-surface">
        <GraduationCap className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-headline-sm font-bold text-on-surface">
          {result.name}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-[var(--font-label)] text-label-sm text-on-surface-variant">
          {location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {location}
            </span>
          )}
          {result.globalRank ? <span>#{result.globalRank} global</span> : null}
          {result.acceptanceRate != null ? (
            <span>{Math.round(result.acceptanceRate * 100)}% accept</span>
          ) : null}
          {result.sizeBucket ? <span className="capitalize">{result.sizeBucket}</span> : null}
        </p>
      </div>
      <SaveToggle
        variant="icon"
        saved={saved}
        onAdd={async () => {
          if (!isAuthenticated) {
            requireAuth();
            return;
          }
          await addFromSearch(result.id);
        }}
        onRemove={async () => {
          if (!isAuthenticated) return;
          await removeByUniversity(result.source, result.externalId);
        }}
      />
    </motion.li>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-on-surface/25 bg-surface/60 p-8 text-center backdrop-blur-sm">
      <p className="text-body-lg text-on-surface-variant">{children}</p>
    </div>
  );
}

function LoadingHint() {
  return (
    <div className="rounded-2xl border-2 border-on-surface bg-surface/85 p-8 text-center qc-hard-shadow-sm">
      <motion.span
        aria-hidden
        className="mx-auto block h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      />
      <p className="mt-3 text-body-md text-on-surface-variant">Searching…</p>
    </div>
  );
}
