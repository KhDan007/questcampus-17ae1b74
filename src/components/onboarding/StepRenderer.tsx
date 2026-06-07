"use client";

import { OptionCard } from "./OptionCard";
import { RankSelect } from "./RankSelect";
import { TextField, NumberField, SelectField } from "./Fields";
import { CountryCombobox } from "./CountryCombobox";
import { suggestEducationSystem } from "@/lib/onboarding/countries";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { ChoiceStep, Option, RevealSpec, Step, TestsStep } from "@/lib/onboarding/steps";
import type {
  AnswerValue,
  CountryValue,
  MultiValue,
  RankValue,
  SingleValue,
  TestsValue,
} from "@/lib/onboarding/types";

export function StepRenderer({
  step,
  value,
  onChange,
}: {
  step: Step;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
}) {
  switch (step.type) {
    case "text":
      return (
        <TextField
          autoFocus
          placeholder={step.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "single":
      return <SingleChoice step={step} value={value as SingleValue} onChange={onChange} />;

    case "multi":
      return <MultiChoice step={step} value={value as MultiValue} onChange={onChange} />;

    case "tests":
      return <TestsChoice step={step} value={value as TestsValue} onChange={onChange} />;

    case "rank": {
      const ranked = (value as RankValue)?.ranked ?? [];
      return (
        <RankSelect
          options={step.options}
          ranked={ranked}
          rankCount={step.rankCount}
          onChange={(r) => onChange({ ranked: r })}
        />
      );
    }

    case "country":
      return <CountryStep value={value as CountryValue} onChange={onChange} />;
  }
}

// ── Reveal sub-input ────────────────────────────────────────────────────────
function Reveal({
  spec,
  detail,
  scale,
  onDetail,
  onScale,
}: {
  spec: RevealSpec;
  detail?: string;
  scale?: string;
  onDetail: (s: string) => void;
  onScale?: (s: string) => void;
}) {
  if (spec.kind === "text")
    return (
      <div className="mt-3">
        <TextField
          autoFocus
          placeholder={spec.placeholder}
          value={detail ?? ""}
          onChange={(e) => onDetail(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );

  if (spec.kind === "number")
    return (
      <div className="mt-3">
        <NumberField
          autoFocus
          placeholder={spec.placeholder}
          min={spec.min}
          max={spec.max}
          value={detail ?? ""}
          onChange={(e) => onDetail(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );

  if (spec.kind === "select")
    return (
      <SelectRevealInner spec={spec} detail={detail} onDetail={onDetail} />
    );

  return (
    <ScaleRevealInner spec={spec} detail={detail} scale={scale} onDetail={onDetail} onScale={onScale} />
  );
}

function SelectRevealInner({
  spec,
  detail,
  onDetail,
}: {
  spec: Extract<RevealSpec, { kind: "select" }>;
  detail?: string;
  onDetail: (s: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
      <SelectField value={detail ?? ""} onChange={(e) => onDetail(e.target.value)}>
        <option value="" disabled>
          {spec.placeholder ?? t("ob.reveal.selectPlaceholder")}
        </option>
        {spec.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </SelectField>
    </div>
  );
}

function ScaleRevealInner({
  spec,
  detail,
  scale,
  onDetail,
  onScale,
}: {
  spec: Extract<RevealSpec, { kind: "scale-number" }>;
  detail?: string;
  scale?: string;
  onDetail: (s: string) => void;
  onScale?: (s: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
      <NumberField
        autoFocus
        placeholder={spec.placeholder}
        className="flex-1"
        value={detail ?? ""}
        onChange={(e) => onDetail(e.target.value)}
      />
      <SelectField
        className="w-40"
        value={scale ?? ""}
        onChange={(e) => onScale?.(e.target.value)}
      >
        <option value="" disabled>
          {t("ob.reveal.scalePlaceholder")}
        </option>
        {spec.scales.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </SelectField>
    </div>
  );
}

// ── Single choice (radio) ───────────────────────────────────────────────────
function SingleChoice({
  step,
  value,
  onChange,
}: {
  step: ChoiceStep;
  value: SingleValue | undefined;
  onChange: (v: SingleValue) => void;
}) {
  const choice = value?.choice;
  return (
    <div className="space-y-2.5">
      {step.options.map((opt, i) => {
        const selected = choice === opt.value;
        return (
          <OptionCard
            key={opt.value}
            label={opt.label}
            selected={selected}
            index={i}
            onSelect={() =>
              onChange({ choice: opt.value, detail: value?.detail, detailScale: value?.detailScale })
            }
          >
            {selected && opt.reveal && (
              <Reveal
                spec={opt.reveal}
                detail={value?.detail}
                scale={value?.detailScale}
                onDetail={(d) =>
                  onChange({ choice: opt.value, detail: d, detailScale: value?.detailScale })
                }
                onScale={(s) =>
                  onChange({ choice: opt.value, detail: value?.detail, detailScale: s })
                }
              />
            )}
          </OptionCard>
        );
      })}
    </div>
  );
}

// ── Multi choice ────────────────────────────────────────────────────────────
function MultiChoice({
  step,
  value,
  onChange,
}: {
  step: ChoiceStep;
  value: MultiValue | undefined;
  onChange: (v: MultiValue) => void;
}) {
  const selected = value?.selected ?? [];
  const details = value?.details ?? {};
  const atMax = step.maxSelections != null && selected.length >= step.maxSelections;

  function toggle(opt: Option) {
    const has = selected.includes(opt.value);
    const next = has
      ? selected.filter((v) => v !== opt.value)
      : atMax
        ? selected
        : [...selected, opt.value];
    onChange({ selected: next, details, optionalDetail: value?.optionalDetail });
  }

  return (
    <div className="space-y-2.5">
      {step.options.map((opt, i) => {
        const isSel = selected.includes(opt.value);
        const dimmed = atMax && !isSel;
        return (
          <div key={opt.value} className={dimmed ? "opacity-45" : ""}>
            <OptionCard
              label={opt.label}
              selected={isSel}
              multi
              index={i}
              onSelect={() => toggle(opt)}
            >
              {isSel && opt.reveal && (
                <Reveal
                  spec={opt.reveal}
                  detail={details[opt.value]}
                  onDetail={(d) =>
                    onChange({
                      selected,
                      details: { ...details, [opt.value]: d },
                      optionalDetail: value?.optionalDetail,
                    })
                  }
                />
              )}
            </OptionCard>
          </div>
        );
      })}

      {step.maxSelections && (
        <MultiCount selected={selected.length} max={step.maxSelections} />
      )}

      {step.optionalDetail && selected.length > 0 && (
        <div className="pt-1">
          <Reveal
            spec={step.optionalDetail}
            detail={value?.optionalDetail}
            onDetail={(d) => onChange({ selected, details, optionalDetail: d })}
          />
        </div>
      )}
    </div>
  );
}

// ── Standardized tests (multi + per-test score) ─────────────────────────────
function TestsChoice({
  step,
  value,
  onChange,
}: {
  step: TestsStep;
  value: TestsValue | undefined;
  onChange: (v: TestsValue) => void;
}) {
  const selected = value?.selected ?? [];
  const scores = value?.scores ?? {};

  const EXCLUSIVE = ["planning", "none_pref"];

  function toggle(opt: Option) {
    const has = selected.includes(opt.value);
    let next: string[];
    if (has) next = selected.filter((v) => v !== opt.value);
    else if (EXCLUSIVE.includes(opt.value)) next = [opt.value];
    else next = [...selected.filter((v) => !EXCLUSIVE.includes(v)), opt.value];
    onChange({ selected: next, scores });
  }

  return (
    <div className="space-y-2.5">
      {step.options.map((opt, i) => {
        const isSel = selected.includes(opt.value);
        return (
          <OptionCard
            key={opt.value}
            label={opt.label}
            selected={isSel}
            multi
            index={i}
            onSelect={() => toggle(opt)}
          >
            {isSel && opt.reveal && (
              <Reveal
                spec={opt.reveal}
                detail={scores[opt.value]}
                onDetail={(d) => onChange({ selected, scores: { ...scores, [opt.value]: d } })}
              />
            )}
          </OptionCard>
        );
      })}
    </div>
  );
}

// ── Country picker ─────────────────────────────────────────────────────────
function CountryStep({
  value,
  onChange,
}: {
  value: CountryValue | undefined;
  onChange: (v: CountryValue) => void;
}) {
  return (
    <div className="space-y-4">
      <CountryCombobox
        value={value?.country}
        onChange={(code) =>
          onChange({
            country: code,
            city: value?.city,
            eduSystem: value?.eduSystem ?? suggestEducationSystem(code),
          })
        }
      />

      {value?.country && (
        <>
          <TextField
            label="City (optional)"
            placeholder="Used for timezone & regional scholarships"
            value={value.city ?? ""}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
          />
          <TextField
            label="Education system"
            placeholder="e.g. A-Levels, Abitur, IB…"
            value={value.eduSystem ?? ""}
            onChange={(e) => onChange({ ...value, eduSystem: e.target.value })}
          />
        </>
      )}
    </div>
  );
}
