"use client";

import { OptionCard } from "./OptionCard";
import type { Option } from "@/lib/onboarding/steps";

// Rank top-N picker (Step 18). Click to assign rank in order; click again to
// remove and resequence. Assigned rank shown as amber badge. At max, remaining
// options dim until one is freed.
export function RankSelect({
  options,
  ranked,
  rankCount,
  onChange,
}: {
  options: Option[];
  ranked: string[];
  rankCount: number;
  onChange: (ranked: string[]) => void;
}) {
  function toggle(value: string) {
    const idx = ranked.indexOf(value);
    if (idx >= 0) {
      onChange(ranked.filter((v) => v !== value));
    } else if (ranked.length < rankCount) {
      onChange([...ranked, value]);
    }
  }

  const full = ranked.length >= rankCount;

  return (
    <div className="space-y-2.5">
      {options.map((opt, i) => {
        const rank = ranked.indexOf(opt.value);
        const isRanked = rank >= 0;
        const dimmed = full && !isRanked;
        return (
          <div key={opt.value} className={dimmed ? "opacity-45" : ""}>
            <OptionCard
              label={opt.label}
              selected={isRanked}
              multi
              index={i}
              badge={isRanked ? String(rank + 1) : undefined}
              onSelect={() => toggle(opt.value)}
            />
          </div>
        );
      })}
      <p className="pt-1 text-label-sm text-on-surface-variant">
        {ranked.length} of {rankCount} ranked
        {full ? " — tap a card to swap." : "."}
      </p>
    </div>
  );
}
