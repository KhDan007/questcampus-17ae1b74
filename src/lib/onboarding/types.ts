// Runtime answer shapes — one per StepType. Stored in Convex as `answers`
// (a free-form object keyed by Step.field) plus the few promoted columns the
// recommendation engine will index on (firstName, lifeStage, grades, …).

export type TextValue = string;

export type SingleValue = {
  choice: string;
  // Free-form / detail captured by a chosen option's `reveal` (e.g. exact GPA).
  detail?: string;
  detailScale?: string; // for scale-number reveals (GPA out of 4.0/5.0/…)
};

export type MultiValue = {
  selected: string[];
  // Per-option detail for options that reveal a sub-input (region, etc.).
  details?: Record<string, string>;
  // The step-level optional follow-up (e.g. "Pick a specific major").
  optionalDetail?: string;
};

export type TestsValue = {
  selected: string[];
  // Per-test score band / value (sat -> "1450-1550", etc.).
  scores?: Record<string, string>;
};

export type RankValue = {
  ranked: string[]; // ordered, highest priority first
};

export type CountryValue = {
  country: string; // ISO code
  city?: string;
  eduSystem?: string;
};

export type AnswerValue =
  | TextValue
  | SingleValue
  | MultiValue
  | TestsValue
  | RankValue
  | CountryValue;

export type Answers = Record<string, AnswerValue>;
