#!/usr/bin/env node
// Build-time translator: walks the English source dictionary and asks the
// Lovable AI Gateway or OpenAI to translate it into every supported non-English
// language. Writes one JSON file per language to src/lib/i18n/generated/.
//
// Run with: node scripts/translate-i18n.mjs
// Requires: LOVABLE_API_KEY or OPENAI_API_KEY env var.
//
// Translations are produced in batches and merged with any existing JSON so
// re-runs are incremental (only missing keys are requested).

import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "src/lib/i18n/generated");
const SRC_DIR = path.join(ROOT, "src");

const API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const OPENAI_MODEL = "gpt-5.4-mini";
const BATCH_SIZE = 40;

const VISIBLE_ATTRS = new Set([
  "aria-label",
  "aria-description",
  "title",
  "placeholder",
  "alt",
]);

const VISIBLE_PROP_NAMES = new Set([
  "badge",
  "blurb",
  "body",
  "caption",
  "copy",
  "cta",
  "description",
  "desc",
  "empty",
  "error",
  "eyebrow",
  "helper",
  "headline",
  "hint",
  "label",
  "message",
  "microcopy",
  "name",
  "note",
  "placeholder",
  "prompt",
  "question",
  "sourceLabel",
  "status",
  "sub",
  "subject",
  "subtitle",
  "summary",
  "tag",
  "text",
  "title",
  "topTip",
  "verdict",
]);

const VISIBLE_CALLS = new Set([
  "alert",
  "confirm",
  "setError",
  "setParseErr",
  "setReviewErr",
  "toast",
  "toast.error",
  "toast.info",
  "toast.message",
  "toast.success",
  "toast.warning",
]);

const VISIBLE_VAR_NAME =
  /(badge|blurb|body|caption|copy|cta|description|desc|empty|error|eyebrow|helper|headline|label|message|microcopy|note|placeholder|status|subtitle|summary|tag|text|title|toast)$/i;

const LANGS = [
  { code: "ru", name: "Russian" },
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

function toPosix(p) {
  return p.replace(/\\/g, "/");
}

function relPath(p) {
  return toPosix(path.relative(ROOT, p));
}

function shouldSkipFile(file) {
  const rel = relPath(file);
  if (!/\.(ts|tsx)$/.test(rel)) return true;
  if (/\.(test|spec)\.(ts|tsx)$/.test(rel)) return true;
  return (
    rel.startsWith("src/convex/_generated/") ||
    rel.startsWith("src/lib/i18n/generated/") ||
    rel === "src/lib/i18n/source.ts" ||
    rel === "src/lib/i18n/translations.ts" ||
    rel === "src/routeTree.gen.ts"
  );
}

async function walkFiles(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkFiles(full, out);
    else if (!shouldSkipFile(full)) out.push(full);
  }
  return out;
}

function normalizeLiteral(text) {
  return text.replace(/\s+/g, " ").trim();
}

function shouldTranslateLiteral(text) {
  if (!text || text.length < 2 || text.length > 320) return false;
  if (!/[A-Za-z]/.test(text)) return false;
  if (/^(https?:|mailto:|tel:|data:|blob:|\/|\.\/|\.\.\/|#)/i.test(text)) return false;
  if (/^[@A-Z0-9_./:-]+$/.test(text) && !text.includes(" ")) return false;
  if (/^[a-z0-9_-]+(\.[a-z0-9_-]+)+$/i.test(text)) return false;
  if (/^[a-z][a-z0-9_-]*:[a-z0-9_-]+$/i.test(text)) return false;
  if (
    text.includes(" ") &&
    /[:[\]/]/.test(text) &&
    /^[a-z0-9_:/[\]().%\-\s]+$/i.test(text)
  ) {
    return false;
  }
  if (/^(GET|POST|PUT|PATCH|DELETE|Bearer|Authorization)$/i.test(text)) return false;
  return true;
}

function hashLiteral(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h) ^ text.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function propName(name) {
  if (!name) return "";
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return "";
}

function callName(expr) {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return `${callName(expr.expression)}.${expr.name.text}`;
  return "";
}

function collectStringLeaves(node, add) {
  const visit = (n) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) add(n.text);
    ts.forEachChild(n, visit);
  };
  visit(node);
}

async function extractUiLiterals(existingSource) {
  const files = await walkFiles(SRC_DIR);
  const out = {};
  const seenValues = new Set(Object.values(existingSource).map(normalizeLiteral));

  const add = (value) => {
    const text = normalizeLiteral(value);
    if (!shouldTranslateLiteral(text) || seenValues.has(text)) return;
    let key = `literal.${hashLiteral(text)}`;
    let suffix = 2;
    while (out[key] && out[key] !== text) key = `literal.${hashLiteral(text)}.${suffix++}`;
    out[key] = text;
    seenValues.add(text);
  };

  for (const file of files) {
    const sourceText = await fs.readFile(file, "utf8");
    const source = ts.createSourceFile(
      file,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    const visit = (node, inRenderableJsx = false) => {
      const renderable =
        inRenderableJsx || (ts.isJsxExpression(node) && !ts.isJsxAttribute(node.parent));

      if (ts.isJsxText(node)) add(node.getText(source));

      if (ts.isJsxAttribute(node)) {
        const attr = node.name.getText(source);
        if (VISIBLE_ATTRS.has(attr) && node.initializer) {
          if (ts.isStringLiteral(node.initializer)) add(node.initializer.text);
          else collectStringLeaves(node.initializer, add);
        }
      }

      if (
        (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
        renderable
      ) {
        add(node.text);
      }

      if (ts.isPropertyAssignment(node) && VISIBLE_PROP_NAMES.has(propName(node.name))) {
        collectStringLeaves(node.initializer, add);
      }

      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        VISIBLE_VAR_NAME.test(node.name.text) &&
        node.initializer
      ) {
        collectStringLeaves(node.initializer, add);
      }

      if (ts.isCallExpression(node) && VISIBLE_CALLS.has(callName(node.expression))) {
        for (const arg of node.arguments) collectStringLeaves(arg, add);
      }

      ts.forEachChild(node, (child) => visit(child, renderable));
    };

    visit(source);
  }

  console.log(`Extracted UI literals: ${Object.keys(out).length} keys from ${files.length} files`);
  return out;
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

  const apiKey = process.env.LOVABLE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const res = await fetch(apiKey ? API_URL : OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey ?? openaiKey}`,
    },
    body: JSON.stringify({
      model: apiKey ? MODEL : OPENAI_MODEL,
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
  const baseSource = await loadSource();
  const source = { ...baseSource, ...(await extractUiLiterals(baseSource)) };
  const keys = Object.keys(source);
  console.log(`English source: ${keys.length} keys`);

  if (process.env.I18N_DRY_RUN === "1") return;

  if (!process.env.LOVABLE_API_KEY && !process.env.OPENAI_API_KEY) {
    console.error("LOVABLE_API_KEY or OPENAI_API_KEY env var is required");
    process.exit(1);
  }

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
