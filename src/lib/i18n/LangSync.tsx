"use client";

// Persists the user's chosen UI language onto their account whenever it changes
// while signed in. Without this, server-side output (the deep-agent chat, job
// summaries, emails, credit notices) would follow the signup-time language, not
// the one the user actually picked — the classic "UI is Russian but the AI
// replies in English" inconsistency. Renders nothing.

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useI18n } from "./I18nProvider";
import { useAuth } from "@/lib/auth/useAuth";
import { auth } from "@/lib/auth/client";

export function LangSync() {
  const { lang } = useI18n();
  const { isAuthenticated } = useAuth();
  const setLang = useMutation(api.auth.setLang);
  const lastSynced = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = auth.getSession()?.token;
    if (!token) return;
    if (lastSynced.current === lang) return;
    lastSynced.current = lang;
    // Idempotent server-side (only patches when different). Fire-and-forget.
    void setLang({ token, lang }).catch(() => {
      // A failed sync just means server output stays on the previous language;
      // non-critical, will retry on the next change.
      lastSynced.current = null;
    });
  }, [lang, isAuthenticated, setLang]);

  return null;
}
