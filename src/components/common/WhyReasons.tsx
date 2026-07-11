// Renders a recommendation's "why it fits" copy as a tight bullet list. The
// backend now returns 2-3 short reasons, one per line; older cached recs may
// still be a single paragraph, which we render as-is (one item, no bullet).

export function WhyReasons({ why, className }: { why?: string | null; className?: string }) {
  if (!why) return null;
  const reasons = why
    .split(/\n+/)
    .map((r) => r.replace(/^[-•*•\d.)\s]+/, "").trim())
    .filter(Boolean);

  if (reasons.length <= 1) {
    return <p className={className}>{reasons[0] ?? why}</p>;
  }

  return (
    <ul className={`space-y-1.5 ${className ?? ""}`}>
      {reasons.slice(0, 4).map((r, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-on-surface/25" aria-hidden />
          <span className="min-w-0">{r}</span>
        </li>
      ))}
    </ul>
  );
}
