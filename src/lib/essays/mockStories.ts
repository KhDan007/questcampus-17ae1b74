// Shared helpers for filling in [ADD: …] placeholders with plausible
// mock content so users can see what a finished essay reads like.

const MOCK_SENTENCES = [
  "the smell of stale chalk and instant coffee in the back of the lab",
  "my grandmother's hands, calloused from forty years of stitching uniforms",
  "the moment the auditorium fell silent and every prepared word evaporated",
  "a half-finished bridge model collapsing in front of the whole class",
  "the 2:14 a.m. message from a student in Nairobi saying the code finally compiled",
  "the rain on the bus window the morning of the regional finals",
  "a single yellow sticky note on the fridge: keep going",
  "the way Mrs. Adebayo paused, then said, you're allowed to be wrong here",
  "a worn copy of Sapiens borrowed and never returned",
  "the quiet pride of watching my younger brother finally read aloud",
  "a spreadsheet with 412 rows of failed experiments and one that worked",
  "the smell of solder and the hum of an old desktop fan at 3 a.m.",
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Replace `[ADD: hint]` placeholders in `text` with deterministic mock
 * sentences so the user can preview a complete essay. The hint is preserved
 * inside the mock so the swap feels intentional, not random.
 */
export function fillPlaceholdersWithMocks(text: string): {
  text: string;
  count: number;
} {
  let count = 0;
  const next = text.replace(/\[ADD:\s*([^\]]+)\]/g, (_match, hintRaw: string) => {
    const hint = hintRaw.trim().replace(/[.?!]+$/, "");
    const idx = (hashStr(hint) + count) % MOCK_SENTENCES.length;
    count += 1;
    return MOCK_SENTENCES[idx];
  });
  return { text: next, count };
}

/**
 * Generate a single mock sentence for one specific placeholder hint.
 * Used by the per-placeholder popup so the user can choose between writing
 * the moment themselves or accepting a mock.
 */
export function mockForHint(hint: string): string {
  const cleaned = hint.replace(/^\[ADD:\s*/, "").replace(/\]$/, "").trim();
  const idx = hashStr(cleaned) % MOCK_SENTENCES.length;
  return MOCK_SENTENCES[idx];
}

export function hasPlaceholders(text: string): boolean {
  return /\[ADD:[^\]]+\]/.test(text);
}
