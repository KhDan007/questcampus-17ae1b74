"use client";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { auth } from "@/lib/auth/client";
import { getSessionId } from "@/lib/onboarding/session";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/unlock/success")({
  head: () => ({ meta: [{ title: "QuestCampus — Unlocking your matches" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  component: UnlockSuccessPage,
});

function GradCap() {
  return (
    <svg width="160" height="160" viewBox="0 0 120 120" fill="none" stroke="#111111" strokeWidth="3" aria-hidden>
      <polygon points="60,20 110,42 60,64 10,42" />
      <path d="M30 52 V72 Q60 88 90 72 V52" />
      <line x1="110" y1="42" x2="110" y2="78" />
      <circle cx="110" cy="82" r="4" fill="#111111" />
    </svg>
  );
}

function UnlockSuccessPage() {
  const navigate = useNavigate();
  const token = auth.getSession()?.token;
  const recommend = useAction(api.rag.recommend.recommend);
  const [primed, setPrimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  const entitlement = useQuery(api.payments.entitlement, token ? { token } : "skip") as
    | { paid: boolean } | undefined;
  const isPaid = entitlement?.paid === true;

  useEffect(() => {
    if (!isPaid || primed) return;
    let cancelled = false;
    (async () => {
      try {
        const sessionId = getSessionId();
        if (!sessionId || !token) return;
        await recommend({ sessionId, token, plan: "paid", force: true });
        if (!cancelled) {
          setPrimed(true);
          setTimeout(() => navigate({ to: "/profile" }), 800);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load matches.");
      }
    })();
    return () => { cancelled = true; };
  }, [isPaid, primed, recommend, token, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center" style={{ background: "#FFCF00" }}>
      <div className="mx-auto max-w-[520px]">
        {!token ? (
          <div>
            <h1 className="font-display text-ink" style={{ fontWeight: 800, fontSize: 36 }}>{t("unlockOk.signedOutTitle")}</h1>
            <p className="mt-3 font-body text-ink" style={{ fontSize: 16 }}>{t("unlockOk.signedOutBody")}</p>
            <Link to="/signin" className="bc-btn bc-btn-blue mt-6">{t("unlockOk.signin")}</Link>
          </div>
        ) : isPaid ? (
          <div>
            <div className="flex justify-center"><GradCap /></div>
            <h1 className="mt-6 font-display text-ink" style={{ fontWeight: 800, fontSize: "clamp(2.5rem, 6vw, 4rem)", lineHeight: 1 }}>
              {t("unlockOk.title")}
            </h1>
            <p className="mt-4 font-body text-ink" style={{ fontSize: 18 }}>
              {primed ? t("unlockOk.taking") : t("unlockOk.loading")}
            </p>
            {error && <p className="mt-3 font-body" style={{ fontSize: 13, color: "#E63022" }}>{error}</p>}
            <Link
              to="/profile"
              className="mt-8 inline-flex h-[52px] items-center justify-center px-6 font-display"
              style={{ background: "#1B4FD8", color: "#FFFFFF", border: "2px solid #111111", boxShadow: "4px 4px 0 #FFFFFF", fontWeight: 700, fontSize: 18 }}
            >
              {t("unlockOk.go")} →
            </Link>
            <p className="mt-6 font-body text-ink" style={{ fontSize: 12 }}>
              Invite a friend and both of you get a discount.
            </p>
          </div>
        ) : (
          <div>
            <div
              className="mx-auto"
              style={{
                width: 40, height: 40, border: "4px solid #111111", borderTopColor: "transparent",
                borderRadius: "50%", animation: "spin 0.9s linear infinite",
              }}
            />
            <h1 className="mt-6 font-display text-ink" style={{ fontWeight: 800, fontSize: 28 }}>{t("unlockOk.waiting")}</h1>
            <p className="mt-3 font-body text-ink" style={{ fontSize: 16 }}>{t("unlockOk.waitingBody")}</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}
      </div>
    </main>
  );
}
