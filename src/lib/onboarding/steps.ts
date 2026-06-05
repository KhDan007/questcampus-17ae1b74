// Declarative onboarding configuration — single source of truth for the whole
// flow (MVP_SPEC §2). The flow renderer, progress bar, validation, and the
// Convex answer shape are all derived from this. Add/edit a step here and the
// UI follows. Keep `field` values in sync with convex/schema.ts answers union.

export type ChapterId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Chapter = {
  id: ChapterId;
  title: string; // shown in the progress bar, e.g. "Your Academic Story"
  emoji: string;
};

export const CHAPTERS: Chapter[] = [
  { id: 1, title: "Nice to Meet You", emoji: "👋" },
  { id: 2, title: "Your Academic Story", emoji: "📚" },
  { id: 3, title: "Life Outside the Classroom", emoji: "🎨" },
  { id: 4, title: "Your Dreams & Ambitions", emoji: "🌟" },
  { id: 5, title: "The Practical Side", emoji: "💰" },
  { id: 6, title: "Your Ideal University", emoji: "🏛️" },
  { id: 7, title: "Let's Make a Plan", emoji: "🗓️" },
];

export type Option = {
  value: string;
  label: string;
  // When chosen, reveals a free-form / detail sub-input (e.g. "exact GPA").
  reveal?: RevealSpec;
};

export type RevealSpec =
  | { kind: "text"; placeholder?: string }
  | { kind: "number"; placeholder?: string; min?: number; max?: number }
  | {
      kind: "scale-number"; // numeric value + a unit/scale selector
      placeholder?: string;
      scales: { value: string; label: string }[];
    }
  | { kind: "select"; placeholder?: string; options: { value: string; label: string }[] };

// Each step maps to exactly one `field` persisted on the profile.
export type StepType =
  | "text" // single short text (first name, city)
  | "single" // pick exactly one option (radio cards)
  | "multi" // select all that apply
  | "rank" // rank top N
  | "country" // searchable country picker (+ optional city + edu system)
  | "tests"; // standardized-tests composite (multi + per-test sub-score)

export type BaseStep = {
  step: number; // 1..22, matches MVP_SPEC numbering
  chapter: ChapterId;
  field: string; // key on the answers object / Convex doc
  title: string; // the question prompt (warm microcopy)
  helper?: string; // smaller sub-prompt under the title
  required?: boolean;
  // Optional warm confirmation shown after answering (MVP_SPEC onboarding rules).
  affirmation?: string;
};

export type TextStep = BaseStep & {
  type: "text";
  placeholder?: string;
};

export type ChoiceStep = BaseStep & {
  type: "single" | "multi";
  options: Option[];
  maxSelections?: number; // for multi (e.g. fields of study: up to 3)
  optionalDetail?: RevealSpec; // e.g. "Pick a specific major" after multi
};

export type RankStep = BaseStep & {
  type: "rank";
  options: Option[];
  rankCount: number; // rank top N
};

export type CountryStep = BaseStep & {
  type: "country";
};

export type TestsStep = BaseStep & {
  type: "tests";
  options: Option[];
};

export type Step =
  | TextStep
  | ChoiceStep
  | RankStep
  | CountryStep
  | TestsStep;

export const STEPS: Step[] = [
  // ── Chapter 1 — Nice to Meet You ──────────────────────────────────────────
  {
    step: 1,
    chapter: 1,
    field: "firstName",
    type: "text",
    required: true,
    title: "First things first — what should we call you?",
    helper: "Just your first name keeps things casual.",
    placeholder: "Your first name",
  },
  {
    step: 2,
    chapter: 1,
    field: "lifeStage",
    type: "single",
    required: true,
    title: "Hey {name}! Where are you at right now?",
    options: [
      { value: "high_school", label: "I'm still in high school" },
      { value: "graduated", label: "I just graduated — figuring out next steps" },
      { value: "gap_year", label: "I took a gap year (or two 😄)" },
      { value: "transfer", label: "I'm looking to transfer universities" },
      { value: "grad", label: "I'm applying for graduate school" },
      { value: "other", label: "Something else" },
    ],
  },
  {
    step: 3,
    chapter: 1,
    field: "home",
    type: "country",
    title: "And where in the world are you from?",
    helper: "We use this for timezone and regional scholarships.",
  },

  // ── Chapter 2 — Your Academic Story ───────────────────────────────────────
  {
    step: 4,
    chapter: 2,
    field: "grades",
    type: "single",
    required: true,
    title: "How have your grades been overall?",
    helper: "Be honest — this helps us find the right fit for YOU.",
    affirmation: "Got it — we'll find schools where students just like you thrive.",
    options: [
      { value: "top", label: "Mostly top marks — I'm usually near the top" },
      { value: "strong", label: "Pretty strong — above average most of the time" },
      { value: "middle", label: "Solid middle ground — consistent and steady" },
      { value: "mixed", label: "Up and down — some subjects I crush, others not so much" },
      { value: "improving", label: "I've had a tough time, but I'm working on it" },
      {
        value: "exact",
        label: "Tell us your exact GPA",
        reveal: {
          kind: "scale-number",
          placeholder: "e.g. 3.8",
          scales: [
            { value: "4.0", label: "out of 4.0" },
            { value: "5.0", label: "out of 5.0" },
            { value: "10", label: "out of 10" },
            { value: "100", label: "out of 100" },
            { value: "other", label: "other scale" },
          ],
        },
      },
    ],
  },
  {
    step: 5,
    chapter: 2,
    field: "subjects",
    type: "multi",
    title: "Which subjects did you genuinely enjoy?",
    helper: "Even if just one! Select all that apply.",
    options: [
      { value: "math", label: "Math or anything numbers-related" },
      { value: "science", label: "Science (physics, chemistry, biology)" },
      { value: "cs", label: "Computer science / coding" },
      { value: "social", label: "History, politics, or social studies" },
      { value: "literature", label: "Literature, writing, or languages" },
      { value: "art", label: "Art, design, or music" },
      { value: "business", label: "Economics or business" },
      { value: "psych", label: "Psychology or philosophy" },
      { value: "pe", label: "Physical education / health" },
      { value: "none", label: "Nothing really stood out yet — and that's okay" },
    ],
  },
  {
    step: 6,
    chapter: 2,
    field: "tests",
    type: "tests",
    title: "Have you taken any of these?",
    helper: "Select all that apply — or none.",
    options: [
      {
        value: "sat",
        label: "SAT",
        reveal: {
          kind: "select",
          placeholder: "Score range",
          options: [
            { value: "<1200", label: "Under 1200" },
            { value: "1200-1350", label: "1200–1350" },
            { value: "1350-1450", label: "1350–1450" },
            { value: "1450-1550", label: "1450–1550" },
            { value: "1550+", label: "1550+" },
          ],
        },
      },
      {
        value: "act",
        label: "ACT",
        reveal: {
          kind: "select",
          placeholder: "Score range",
          options: [
            { value: "<24", label: "Under 24" },
            { value: "24-28", label: "24–28" },
            { value: "28-31", label: "28–31" },
            { value: "31-34", label: "31–34" },
            { value: "34-36", label: "34–36" },
          ],
        },
      },
      {
        value: "ielts",
        label: "IELTS",
        reveal: {
          kind: "select",
          placeholder: "Band",
          options: [
            { value: "<6.0", label: "Under 6.0" },
            { value: "6.0-6.5", label: "6.0–6.5" },
            { value: "7.0-7.5", label: "7.0–7.5" },
            { value: "8.0+", label: "8.0+" },
          ],
        },
      },
      {
        value: "toefl",
        label: "TOEFL",
        reveal: {
          kind: "select",
          placeholder: "Score",
          options: [
            { value: "<80", label: "Under 80" },
            { value: "80-95", label: "80–95" },
            { value: "95-110", label: "95–110" },
            { value: "110+", label: "110+" },
          ],
        },
      },
      { value: "duolingo", label: "Duolingo English Test" },
      {
        value: "national",
        label: "A national/regional exam (IB, A-Levels, Gaokao, CBSE, Abitur…)",
      },
      { value: "planning", label: "None yet — I'm planning to take one" },
      { value: "none_pref", label: "None yet — and I'd prefer not to" },
    ],
  },
  {
    step: 7,
    chapter: 2,
    field: "learningStyle",
    type: "single",
    title: "Everyone's different — how do you actually absorb information best?",
    options: [
      { value: "hands_on", label: "Hands-on: I learn by doing, building, experimenting" },
      { value: "visual", label: "Visual: diagrams, videos, seeing it mapped out" },
      { value: "reading", label: "Reading & writing: notes, books, structured materials" },
      { value: "listening", label: "Listening & discussion: lectures, podcasts, talking it through" },
      { value: "mix", label: "A mix — I adapt to whatever works" },
      { value: "unsure", label: "Honestly, I'm still figuring it out" },
    ],
  },

  // ── Chapter 3 — Life Outside the Classroom ────────────────────────────────
  {
    step: 8,
    chapter: 3,
    field: "activities",
    type: "multi",
    title: "What does your life look like outside of class?",
    helper: "Select all that apply.",
    options: [
      { value: "sports", label: "Sports or fitness (competitive or casual)" },
      { value: "music", label: "Music — playing, producing, or singing" },
      { value: "art", label: "Art, photography, or design" },
      { value: "gaming", label: "Gaming or esports" },
      { value: "building", label: "Coding or building things (apps, websites, projects)" },
      { value: "reading", label: "Reading — books, articles, deep dives" },
      { value: "volunteering", label: "Volunteering or community work" },
      { value: "leading", label: "Running a club, team, or project" },
      { value: "work", label: "Part-time job or freelance work" },
      { value: "downtime", label: "Hanging out and recharging — I value my downtime" },
      { value: "watching", label: "Watching films, series, or YouTube rabbit holes" },
      { value: "other", label: "Something else entirely" },
    ],
  },
  {
    step: 9,
    chapter: 3,
    field: "proudOf",
    type: "single",
    title: "What's something you did that made you feel genuinely proud?",
    helper: "Think about the last year or two — it doesn't have to be a trophy.",
    options: [
      { value: "led", label: "I led or started something — a project, club, event, or initiative" },
      { value: "helped", label: "I helped someone in a meaningful way" },
      { value: "skill", label: "I got really good at a skill through hard work" },
      { value: "competed", label: "I competed and placed in something" },
      { value: "created", label: "I created something — art, code, writing, music" },
      { value: "pushed", label: "I pushed through a really tough time" },
      { value: "family", label: "I supported my family in an important way" },
      { value: "not_yet", label: "I honestly haven't had that moment yet — but I'm working towards it" },
    ],
    optionalDetail: { kind: "text", placeholder: "Tell us more in a sentence (optional)" },
  },
  {
    step: 10,
    chapter: 3,
    field: "achievements",
    type: "multi",
    title: "Any formal recognition?",
    helper: "Don't be shy — even small ones count. Select all that apply.",
    options: [
      { value: "honor_roll", label: "Academic honor roll or similar" },
      { value: "school_award", label: "School-level award or prize" },
      { value: "national", label: "Regional or national competition placement" },
      { value: "international", label: "International competition or recognition" },
      { value: "published", label: "Published something (article, research, creative work)" },
      { value: "scholarship", label: "Scholarship or grant I already received" },
      { value: "none", label: "None yet — I'm building towards it" },
    ],
  },

  // ── Chapter 4 — Your Dreams & Ambitions ───────────────────────────────────
  {
    step: 11,
    chapter: 4,
    field: "motivation",
    type: "single",
    title: "What's the main thing driving you towards university?",
    helper: "Pick the one that feels most true.",
    options: [
      { value: "career", label: "I want to pursue a career that requires a specific degree" },
      { value: "explore", label: "I want to explore ideas and figure out what I'm passionate about" },
      { value: "people", label: "I want to meet people from all over the world and grow as a person" },
      { value: "research", label: "I want access to research, labs, and opportunities I can't get elsewhere" },
      { value: "expected", label: "It's the expected path, and I want to see where it leads" },
      { value: "escape", label: "I want to escape my current environment and experience something new" },
      { value: "mix", label: "A mix of all of the above honestly" },
    ],
  },
  {
    step: 12,
    chapter: 4,
    field: "fields",
    type: "multi",
    maxSelections: 3,
    title: "What area of study are you drawn to?",
    helper: "You can always change your mind. Select up to 3.",
    options: [
      { value: "engineering", label: "Engineering & Technology" },
      { value: "science", label: "Science & Research (biology, chemistry, physics, environment)" },
      { value: "cs", label: "Computer Science & AI" },
      { value: "business", label: "Business, Economics & Finance" },
      { value: "arts", label: "Arts, Design & Architecture" },
      { value: "medicine", label: "Medicine & Health" },
      { value: "law", label: "Law & Political Science" },
      { value: "social", label: "Social Sciences & Psychology" },
      { value: "education", label: "Education" },
      { value: "media", label: "Media, Communications & Journalism" },
      { value: "humanities", label: "Humanities (history, philosophy, literature)" },
      { value: "math", label: "Mathematics & Statistics" },
      { value: "performing", label: "Performing Arts & Music" },
      { value: "hospitality", label: "Hospitality, Tourism & Culinary" },
      { value: "unsure", label: "I have no idea yet — show me everything" },
    ],
    optionalDetail: { kind: "text", placeholder: "Pick a specific major (optional)" },
  },
  {
    step: 13,
    chapter: 4,
    field: "futureSelf",
    type: "single",
    title: "Fast forward 10 years — which version of yourself excites you most?",
    options: [
      { value: "specialist", label: "A specialist who is world-class at one thing" },
      { value: "founder", label: "A founder or entrepreneur building something of my own" },
      { value: "researcher", label: "A researcher pushing the boundaries of what we know" },
      { value: "leader", label: "A leader who shapes teams, orgs, or policy" },
      { value: "creative", label: "A creative who makes things that move people" },
      { value: "balanced", label: "Someone living a balanced, meaningful life — work and beyond" },
      { value: "impact", label: "I want to make a real difference in my community or the world" },
      { value: "unsure", label: "Honestly, I just want to figure it out step by step" },
    ],
  },

  // ── Chapter 5 — The Practical Side ────────────────────────────────────────
  {
    step: 14,
    chapter: 5,
    field: "financialNeed",
    type: "single",
    required: true,
    title: "How important is financial support when choosing a university?",
    affirmation: "Thanks for being open — we prioritize scholarship matches for you.",
    options: [
      { value: "critical", label: "Critical — I need a full scholarship or I can't go" },
      { value: "very", label: "Very important — I need significant aid to make it work" },
      { value: "helpful", label: "Helpful — partial support would make a big difference" },
      { value: "nice", label: "Nice to have — I have some resources but would welcome help" },
      { value: "none", label: "Not a concern — finances aren't a barrier for me" },
    ],
  },
  {
    step: 15,
    chapter: 5,
    field: "distance",
    type: "single",
    title: "How far are you open to going?",
    options: [
      { value: "anywhere", label: "Anywhere in the world — the further the adventure, the better" },
      {
        value: "region",
        label: "Another country, but preferably a specific region",
        reveal: {
          kind: "select",
          placeholder: "Which region?",
          options: [
            { value: "americas", label: "Americas" },
            { value: "europe", label: "Europe" },
            { value: "asia", label: "Asia" },
            { value: "middle_east", label: "Middle East" },
            { value: "africa", label: "Africa" },
            { value: "oceania", label: "Oceania" },
          ],
        },
      },
      { value: "own_country_far", label: "Within my own country but far from home" },
      { value: "closeish", label: "Close-ish to home — I want to visit family sometimes" },
      { value: "near_city", label: "I'd prefer to stay in or near my city" },
    ],
  },
  {
    step: 16,
    chapter: 5,
    field: "campusVibe",
    type: "multi",
    title: "What kind of environment sounds like you?",
    helper: "Select all that apply.",
    options: [
      { value: "big_city", label: "Big city campus — cafes, culture, and chaos" },
      { value: "campus_town", label: "A dedicated campus town where university IS the town" },
      { value: "quiet", label: "Quiet, green, and residential — I need space to think" },
      { value: "mixed", label: "Mixed — urban but with a proper campus feel" },
      { value: "no_pref", label: "Doesn't matter much to me" },
    ],
  },

  // ── Chapter 6 — Your Ideal University ─────────────────────────────────────
  {
    step: 17,
    chapter: 6,
    field: "uniSize",
    type: "single",
    title: "How big do you want your university to be?",
    options: [
      { value: "large", label: "Large (20,000+ students) — more resources, more people" },
      { value: "medium", label: "Medium (5,000–20,000) — good balance of both worlds" },
      { value: "small", label: "Small (under 5,000) — tight community, closer with professors" },
      { value: "no_pref", label: "No preference — show me what matches my profile" },
    ],
  },
  {
    step: 18,
    chapter: 6,
    field: "priorities",
    type: "rank",
    rankCount: 3,
    title: "What matters most to you in a university?",
    helper: "Rank your top 3.",
    options: [
      { value: "reputation", label: "Academic reputation and rankings" },
      { value: "alumni", label: "Strong alumni network and career connections" },
      { value: "research", label: "Research opportunities and labs" },
      { value: "diversity", label: "Diversity and international community" },
      { value: "aid", label: "Scholarship and financial aid availability" },
      { value: "student_life", label: "Student life, clubs, and campus culture" },
      { value: "location", label: "Location and city life" },
      { value: "program", label: "Strong program in my specific field" },
      { value: "class_size", label: "Class sizes and access to professors" },
      { value: "sports", label: "Sports and athletics facilities" },
    ],
  },
  {
    step: 19,
    chapter: 6,
    field: "teachingStyle",
    type: "single",
    title: "What kind of learning environment do you thrive in?",
    options: [
      { value: "lecture", label: "Lecture-heavy with structured coursework — I like clarity" },
      { value: "project", label: "Project-based and collaborative — I want to build things" },
      { value: "research", label: "Research-focused — I want to dig deep and contribute new ideas" },
      { value: "flexible", label: "Flexible / self-directed — I do my best work with autonomy" },
      { value: "no_pref", label: "I don't have a strong preference yet" },
    ],
  },

  // ── Chapter 7 — Let's Make a Plan ─────────────────────────────────────────
  {
    step: 20,
    chapter: 7,
    field: "intake",
    type: "single",
    title: "What's your target intake?",
    options: [
      { value: "this_cycle", label: "This cycle — Fall 2026 or Spring 2027" },
      { value: "next_cycle", label: "Next cycle — Fall 2027" },
      { value: "1_2_years", label: "I'm 1–2 years out — early planning mode" },
      { value: "exploring", label: "I'm just exploring for now, no rush" },
    ],
  },
  {
    step: 21,
    chapter: 7,
    field: "progress",
    type: "single",
    title: "How far along are you in your application journey?",
    options: [
      { value: "just_starting", label: "Just starting — I haven't done anything yet" },
      { value: "researching", label: "I've been researching, but haven't applied anywhere" },
      { value: "started_apps", label: "I've started applications at some schools" },
      { value: "applied", label: "I've applied — waiting to hear back" },
      { value: "admitted", label: "I've been admitted somewhere but want to explore options" },
    ],
  },
  {
    step: 22,
    chapter: 7,
    field: "biggestWorry",
    type: "single",
    title: "What's the thing that worries you most about this whole process?",
    helper: "Pick the one that hits closest.",
    options: [
      { value: "grades", label: "I don't know if my grades/scores are good enough" },
      { value: "afford", label: "I can't afford university without a scholarship" },
      { value: "what_study", label: "I don't know what I want to study" },
      { value: "overwhelming", label: "The application process feels overwhelming — I don't know where to start" },
      { value: "wrong_uni", label: "I'm worried I'll pick the wrong university" },
      { value: "language", label: "Language — English isn't my first language" },
      { value: "no_guidance", label: "I don't have anyone guiding me through this" },
      { value: "confident", label: "Honestly, I'm pretty confident — just want the right list" },
    ],
  },
];

export const TOTAL_STEPS = STEPS.length;

export function getStep(step: number): Step | undefined {
  return STEPS.find((s) => s.step === step);
}

export function getChapter(id: ChapterId): Chapter {
  return CHAPTERS.find((c) => c.id === id)!;
}

// Required steps gate "Next"; everything else can be skipped (MVP_SPEC rules).
export function isStepAnswered(step: Step, value: unknown): boolean {
  if (step.type === "text") return typeof value === "string" && value.trim().length > 0;
  if (step.type === "single") return value != null && (value as { choice?: string }).choice != null;
  if (step.type === "country") return value != null && (value as { country?: string }).country != null;
  if (step.type === "multi" || step.type === "tests")
    return Array.isArray((value as { selected?: unknown[] })?.selected) &&
      (value as { selected: unknown[] }).selected.length > 0;
  if (step.type === "rank")
    return Array.isArray((value as { ranked?: unknown[] })?.ranked) &&
      (value as { ranked: unknown[] }).ranked.length > 0;
  return false;
}
