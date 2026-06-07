#!/usr/bin/env node
// Build-time translator: walks the English source dictionary and asks the
// Lovable AI Gateway to translate it into every supported non-English
// language. Writes one JSON file per language to src/lib/i18n/generated/.
//
// Run with: node scripts/translate-i18n.mjs
// Requires: LOVABLE_API_KEY env var.
//
// Translations are produced in batches and merged with any existing JSON so
// re-runs are incremental (only missing keys are requested).

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "src/lib/i18n/generated");

const API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const BATCH_SIZE = 40;

const LANGS = [
  { code: "es", name: "Spanish" },
  { code: "zh", name: "Simplified Chinese" },
  { code: "hi", name: "Hindi" },
  { code: "ar", name: "Arabic" },
  { code: "pt", name: "Portuguese (Brazilian)" },
  { code: "ru", name: "Russian" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "kk", name: "Kazakh" },
];

async function loadSource() {
  // Use Bun to import the TS source (handles tsconfig paths).
  const sourcePath = path.join(ROOT, "src/lib/i18n/source.ts");
  if (!(await fileExists(sourcePath))) {
    throw new Error(`Source not found: ${sourcePath}`);
  }
  // Try TS-native import first (Bun supports this; node 22 needs --experimental-strip-types).
  try {
    const mod = await import(pathToFileURL(sourcePath).href);
    return mod.buildEnglishSource();
  } catch {
    // Fallback: read steps.ts + source.ts manually. Simpler: extract via regex
    // — but we ship Bun, so prefer running this script with `bun`.
    throw new Error(
      "Failed to import source.ts. Run this script with Bun: `bun run scripts/translate-i18n.mjs`",
    );
  }
}

async function fileExists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function readExisting(lang) {
  const p = path.join(OUT_DIR, `${lang}.json`);
  if (!(await fileExists(p))) return {};
  try {
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch {
    return {};
  }
}

async function writeOutput(lang, data) {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const p = path.join(OUT_DIR, `${lang}.json`);
  const sorted = Object.fromEntries(
    Object.entries(data).sort(([a], [b]) => a.localeCompare(b)),
  );
  await fs.writeFile(p, JSON.stringify(sorted, null, 2) + "\n", "utf8");
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function translateBatch(entries, targetLangName) {
  const obj = Object.fromEntries(entries);
  const system = `You are a professional product copywriter and translator. Translate the values of the given JSON object from English into ${targetLangName}. Rules:
- Return ONLY a valid JSON object — same keys, translated values. No prose.
- Preserve placeholders exactly: {name}, {price}, {pct}, {discount}, {refDiscount}, {step}, {total}, {chapter}, {selected}, {max}, {n}, {discounted}, {anchor}, {price_full}, {students}, {percent}, {base}, etc.
- Preserve emoji, leading/trailing arrows like → ←, punctuation, and HTML-like spacing.
- Keep the same tone: warm, friendly, concise, second-person.
- Translate brand-neutral product names naturally; keep "QuestCampus", "Stripe", "Google", "SAT", "ACT", "IELTS", "TOEFL", "Duolingo", "IB", "A-Levels", "Gaokao", "CBSE", "Abitur" untranslated.
- Money amounts (e.g. $9, $1,500) keep the dollar sign.
- For Arabic, write naturally for RTL display; do not reorder placeholders.
- Output MUST be parseable JSON, double-quoted keys and values.`;

  const user = `Target language: ${targetLangName}\n\nJSON to translate:\n${JSON.stringify(obj, null, 2)}`;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI gateway ${res.status}: ${txt.slice(0, 400)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`No content in response: ${JSON.stringify(data).slice(0, 400)}`);

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Strip code fences if any
    const stripped = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    parsed = JSON.parse(stripped);
  }
  return parsed;
}

async function translateOne(source, lang) {
  const existing = await readExisting(lang.code);
  const missing = Object.entries(source).filter(([k]) => !(k in existing));
  if (missing.length === 0) {
    console.log(`[${lang.code}] up-to-date (${Object.keys(existing).length} keys)`);
    return;
  }
  console.log(`[${lang.code}] translating ${missing.length} missing keys → ${lang.name}`);

  const batches = chunk(missing, BATCH_SIZE);
  const merged = { ...existing };
  let i = 0;
  for (const batch of batches) {
    i++;
    let attempt = 0;
    while (attempt < 3) {
      try {
        const translated = await translateBatch(batch, lang.name);
        Object.assign(merged, translated);
        console.log(`  [${lang.code}] batch ${i}/${batches.length} ok (${batch.length} keys)`);
        break;
      } catch (e) {
        attempt++;
        console.warn(`  [${lang.code}] batch ${i} attempt ${attempt} failed: ${e.message}`);
        if (attempt >= 3) {
          console.error(`  [${lang.code}] giving up on batch ${i}; keeping English fallback for ${batch.length} keys`);
          for (const [k, v] of batch) merged[k] = v;
        } else {
          await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
      }
    }
    // Incremental save after each batch so partial runs aren't lost
    await writeOutput(lang.code, merged);
  }
  console.log(`[${lang.code}] done — ${Object.keys(merged).length} keys`);
}

async function main() {
  if (!process.env.LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY env var is required");
    process.exit(1);
  }
  const source = await loadSource();
  const keys = Object.keys(source);
  console.log(`English source: ${keys.length} keys`);

  // Save English too so the runtime can fall back consistently.
  await writeOutput("en", source);

  // Translate sequentially to be gentle on rate limits.
  for (const lang of LANGS) {
    await translateOne(source, lang);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
