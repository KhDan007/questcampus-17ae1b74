"use client";

import { OptionCard } from "./OptionCard";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Option } from "@/lib/onboarding/steps";

// Rank top-N picker (Step 18).
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
  const { t } = useI18n();
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
        {t("ob.rank.count", { selected: ranked.length, total: rankCount })}
        {full ? t("ob.rank.fullHint") : t("ob.rank.endDot")}
      </p>
    </div>
  );
}
