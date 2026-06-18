"use client";

import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Mail, Sparkles } from "lucide-react";
import { joinWaitlist } from "@/lib/waitlist/api";

export function WaitlistV2() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setLoading(true);
    setError("");
    const result = await joinWaitlist(email);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAlreadyJoined(result.alreadyJoined);
    try {
      window.localStorage.setItem("qc.waitlist.email", email);
      const raw = window.localStorage.getItem("qc.waitlist.list");
      const list: { email: string; at: number }[] = raw ? JSON.parse(raw) : [];
      list.push({ email, at: Date.now() });
      window.localStorage.setItem("qc.waitlist.list", JSON.stringify(list));
    } catch {
      // localStorage may be unavailable in private browsing.
    }
    setDone(true);
  }

  return (
    <section id="waitlist" className="relative px-4 py-20 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-(--container-content)">
        <div className="relative overflow-hidden rounded-xl border-2 border-on-surface bg-surface-container-lowest p-6 qc-hard-shadow-primary sm:p-14">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-60">
            <div
              className="animate-aurora-1 absolute -left-20 -top-20 h-[50vh] w-[50vh] rounded-full blur-[120px]"
              style={{
                background: "radial-gradient(circle, rgba(255,95,93,0.35), transparent 65%)",
              }}
            />
            <div
              className="animate-aurora-2 absolute -right-20 -bottom-20 h-[50vh] w-[50vh] rounded-full blur-[120px]"
              style={{
                background: "radial-gradient(circle, rgba(254,183,0,0.30), transparent 65%)",
              }}
            />
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
                Founding access
              </p>
              <h2 className="mt-3 text-display-lg-mobile text-on-surface sm:text-display-lg text-balance">
                Be first when the full admissions workspace opens.
              </h2>
              <p className="mt-4 max-w-xl text-body-lg text-on-surface-variant">
                Essay Assistant is live now. Application Tracker, Document Hub, and the Auto-Apply
                Agent are next — waitlist members unlock them first with{" "}
                <strong className="text-primary">30% off monthly access</strong>. Full access at{" "}
                <strong className="text-on-surface">$15/month</strong> — waitlist price{" "}
                <strong className="text-primary">$10.50/month</strong>.
              </p>

              <div className="mt-6 flex items-center gap-4">
                <AnimatedCounter target={4287} />
                <span className="font-[var(--font-label)] text-label-md text-on-surface-variant">
                  students already in
                </span>
              </div>
            </div>

            <form
              onSubmit={onSubmit}
              className="relative rounded-lg border-2 border-on-surface bg-surface p-5 sm:p-6 qc-hard-shadow"
            >
              {!done ? (
                <>
                  <label
                    htmlFor="wl-email"
                    className="block font-[var(--font-label)] text-label-md font-bold uppercase tracking-wider text-on-surface"
                  >
                    Your email
                  </label>
                  <div
                    className={`mt-2 flex items-center gap-2 rounded-sm border-2 bg-surface-container-lowest px-3 transition-colors focus-within:border-primary ${error ? "border-error" : "border-on-surface"}`}
                  >
                    <Mail className="h-4 w-4 text-on-surface-variant" />
                    <input
                      id="wl-email"
                      type="email"
                      required
                      disabled={loading}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="you@school.edu"
                      className="w-full bg-transparent py-3 font-[var(--font-label)] text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/60 disabled:opacity-50"
                    />
                  </div>
                  {error && <p className="mt-1.5 text-label-sm text-error">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="group mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-on-surface bg-primary px-6 py-3.5 font-display text-headline-sm font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Join the waitlist
                      </>
                    )}
                  </button>
                  <p className="mt-3 font-[var(--font-label)] text-label-sm text-on-surface-variant">
                    No spam. One launch email when each feature ships.
                  </p>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col items-center justify-center py-6 text-center"
                >
                  <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-tertiary-container text-on-tertiary-container">
                    <Check className="h-6 w-6" strokeWidth={3} />
                  </div>
                  <p className="text-headline-sm text-on-surface">
                    {alreadyJoined ? "You're already on the list." : "You're on the list!"}
                  </p>
                  <p className="mt-1 text-body-md text-on-surface-variant">
                    {alreadyJoined
                      ? "You're all set — we'll email you the moment it's ready."
                      : "Check your inbox for confirmation. We'll email you the moment each feature ships — 30% off locked in."}
                  </p>
                </motion.div>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

function AnimatedCounter({ target }: { target: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setN(target);
      return;
    }
    const c = animate(0, target, {
      duration: 1.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => c.stop();
  }, [inView, target, reduce]);

  return (
    <span
      ref={ref}
      className="font-display text-display-lg-mobile sm:text-display-lg font-bold text-primary tabular-nums"
    >
      {n.toLocaleString("en-US")}+
    </span>
  );
}
