"use client";

/**
 * Honest "$0 · free to start" positioning. Shown ONLY to users who have not
 * yet started the paid trial (gate via useFreeHook from @/lib/auth/useAuth).
 *
 * The product is a $15/mo subscription with a 3-day free trial — never imply
 * "free forever". Two variants:
 *   - "badge": a compact pill — "$0 · free to start"
 *   - "line":  a muted honest line — "$0 today · 3 days free · cancel anytime"
 */
export function FreeBadge({
  variant = "badge",
  className = "",
}: {
  variant?: "badge" | "line";
  className?: string;
}) {
  if (variant === "line") {
    return (
      <span
        className={`inline-flex flex-wrap items-center font-[var(--font-label)] text-label-sm text-on-surface-variant ${className}`}
      >
        <span className="font-bold text-on-surface">$0 today</span>
        <span className="mx-1.5 text-on-surface-variant/60">·</span>
        3 days free
        <span className="mx-1.5 text-on-surface-variant/60">·</span>
        cancel anytime
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-secondary-fixed px-2.5 py-1 font-[var(--font-label)] text-label-sm font-bold text-on-secondary-fixed-variant ${className}`}
    >
      $0 · free to start
    </span>
  );
}
