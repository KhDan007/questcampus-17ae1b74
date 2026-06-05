"use client";

import { useMemo, useRef, useState } from "react";
import { SORTED_COUNTRIES, type Country } from "@/lib/onboarding/countries";

// Searchable country autocomplete (Chapter 1, Step 3). MVP-scope countries
// surface first; typing filters by name. Keyboard-navigable.
export function CountryCombobox({
  value,
  onChange,
}: {
  value?: string; // ISO code
  onChange: (code: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useRef(`country-list-${Math.random().toString(36).slice(2)}`).current;

  const selected = SORTED_COUNTRIES.find((c) => c.code === value);

  const results = useMemo<Country[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SORTED_COUNTRIES;
    return SORTED_COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  function choose(c: Country) {
    onChange(c.code);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={selected ? selected.name : "Search for your country…"}
        value={open ? query : selected?.name ?? ""}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && results[active]) {
            e.preventDefault();
            choose(results[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/30"
      />

      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-md border border-outline-variant/70 bg-surface-container-lowest p-1 shadow-[0_12px_28px_-8px_rgba(53,37,205,0.18)]"
        >
          {results.map((c, i) => (
            <li key={c.code} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(c)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-body-md transition-colors ${
                  i === active
                    ? "bg-primary-fixed/70 text-on-surface"
                    : "text-on-surface hover:bg-surface-container-low"
                }`}
              >
                {c.name}
                {c.code === value && <span aria-hidden className="text-primary">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
