// Detects the QuestCampus browser extension via a DOM marker its content
// script sets on our own domain (data-qc-extension="<version>" on <html>).
// Content scripts inject after the page's own scripts on first load, and
// asynchronously on client-side navigation, so this polls briefly rather
// than reading once.

import { useEffect, useState } from "react";

const ATTR = "data-qc-extension";
const POLL_MS = 250;
const POLL_ATTEMPTS = 8;

function readMarker(): string | null {
  if (typeof document === "undefined") return null;
  return document.documentElement.getAttribute(ATTR);
}

export function useExtensionInstalled(): { installed: boolean; checked: boolean } {
  const [version, setVersion] = useState<string | null>(() => readMarker());
  const [checked, setChecked] = useState(() => readMarker() !== null);

  useEffect(() => {
    if (version) {
      setChecked(true);
      return;
    }
    let attempts = 0;
    const id = window.setInterval(() => {
      attempts += 1;
      const v = readMarker();
      if (v) {
        setVersion(v);
        setChecked(true);
        window.clearInterval(id);
      } else if (attempts >= POLL_ATTEMPTS) {
        setChecked(true);
        window.clearInterval(id);
      }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [version]);

  return { installed: !!version, checked };
}
