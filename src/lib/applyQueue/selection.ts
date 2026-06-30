"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "qc.applySelection.v1";

type SelectionItem = {
  source: string;
  externalId: string;
  name: string;
};

function keyOf(s: string, e: string) {
  return `${s}::${e}`;
}

function read(): Record<string, SelectionItem> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, SelectionItem>) : {};
  } catch {
    return {};
  }
}

function write(map: Record<string, SelectionItem>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent("qc:apply-selection-changed"));
  } catch {
    /* noop */
  }
}

export function useApplySelection() {
  const [map, setMap] = useState<Record<string, SelectionItem>>({});

  useEffect(() => {
    setMap(read());
    const onChange = () => setMap(read());
    window.addEventListener("qc:apply-selection-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("qc:apply-selection-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const isSelected = useCallback(
    (source: string, externalId: string) => Boolean(map[keyOf(source, externalId)]),
    [map],
  );

  const toggle = useCallback((item: SelectionItem) => {
    const current = read();
    const k = keyOf(item.source, item.externalId);
    if (current[k]) delete current[k];
    else current[k] = item;
    write(current);
  }, []);

  const remove = useCallback((source: string, externalId: string) => {
    const current = read();
    delete current[keyOf(source, externalId)];
    write(current);
  }, []);

  const clear = useCallback(() => write({}), []);

  const items = Object.values(map);
  return { items, count: items.length, isSelected, toggle, remove, clear };
}

export type { SelectionItem };
