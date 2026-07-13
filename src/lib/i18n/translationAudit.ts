import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import en from "./generated/en.json";
import kk from "./generated/kk.json";
import ru from "./generated/ru.json";
import { AUDIT_TRANSLATIONS, TRANSLATIONS, type Dict } from "./translations";

export type AuditDictionaries = {
  en: Dict;
  ru: Dict;
  kk: Dict;
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SRC_ROOT = path.join(ROOT, "src");
const TRANSLATABLE_ATTRIBUTES = new Set([
  "aria-label",
  "aria-description",
  "title",
  "placeholder",
  "alt",
]);
const RENDERED_COPY_PROPS = new Set(["body"]);
// These literal keys are CSS, browser, date, file-type, or font configuration,
// never rendered product copy. Keep the exception list narrow and explicit.
const TECHNICAL_LITERAL_KEYS = new Set([
  "literal.1nzk645",
  "literal.de5tkt",
  "literal.dm1x68",
  "literal.eq4v4j",
  "literal.o0gut9",
  "literal.vdaau",
]);
const SKIPPED_TAGS = new Set(["svg", "code", "pre"]);
const ALLOWED_FOREIGN_TOKENS = new Set([
  "ACT",
  "AI",
  "API",
  "CBSE",
  "ChatGPT",
  "Chrome",
  "Common",
  "Duolingo",
  "Firefox",
  "GPT",
  "HTML",
  "IB",
  "IELTS",
  "MIT",
  "NUS",
  "PDF",
  "QuestCampus",
  "SAT",
  "Sciences",
  "TOEFL",
  "URL",
  "YouTube",
  "App",
  "Po",
]);
const RUSSIAN_WORDS = new Set([
  "в",
  "и",
  "или",
  "для",
  "на",
  "от",
  "привет",
  "удалить",
  "войти",
  "отмена",
  "загрузить",
  "настройки",
]);

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function hasEnglishWords(value: string): boolean {
  const visible = value.replace(/\{[^}]+}/g, "");
  return /\b(?:[a-z]{2,}|[A-Z][a-z]+)\b/.test(visible);
}

function dictionaries(): AuditDictionaries {
  const english = { ...(en as Dict), ...TRANSLATIONS.en, ...AUDIT_TRANSLATIONS.en };
  return {
    en: english,
    ru: { ...(ru as Dict), ...TRANSLATIONS.ru, ...AUDIT_TRANSLATIONS.ru },
    kk: { ...(kk as Dict), ...TRANSLATIONS.kk, ...AUDIT_TRANSLATIONS.kk },
  };
}

export function findMissingTranslations(values: AuditDictionaries = dictionaries()): string[] {
  const problems: string[] = [];

  for (const key of Object.keys(values.en).sort()) {
    for (const lang of ["ru", "kk"] as const) {
      if (!normalize(values[lang][key] ?? "")) problems.push(`${lang}:${key}`);
    }
  }

  return problems;
}

export function findEnglishFallbacks(values: AuditDictionaries = dictionaries()): string[] {
  const problems: string[] = [];

  for (const [key, english] of Object.entries(values.en).sort(([a], [b]) => a.localeCompare(b))) {
    const normalizedEnglish = normalize(english);
    if (!isUserFacingCopy(key, normalizedEnglish)) continue;
    for (const lang of ["ru", "kk"] as const) {
      if (normalize(values[lang][key] ?? "") === normalizedEnglish) problems.push(`${lang}:${key}`);
    }
  }

  return problems;
}

function isTechnicalLiteral(value: string): boolean {
  if (isUrl(value) || isHtmlEntity(value)) return true;
  if (
    /^[a-z0-9_./:-]+$/i.test(value) ||
    /^[a-z]+(?:-[a-z0-9]+)+(?:\s+[a-z]+(?:-[a-z0-9]+)+)*$/i.test(value)
  ) {
    return true;
  }
  if (
    /^(?:@media|[A-Z]{2,}\s+[a-z]{4}|(?:absolute|block|npx|txt|docx|pdf|noopener|noreferrer|image|apple-system)\b)/i.test(
      value,
    ) ||
    (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(value) && !value.includes("QuestCampus"))
  ) {
    return true;
  }
  return /(?:\[&>|\b(?:flex|grid|text-|bg-|border-|px-|py-|mt-|mb-|h-|w-)|\b(?:solid|transparent|rgba|calc|rotate|opacity|underline|animate)-?\b)/i.test(
    value,
  );
}

function isUserFacingCopy(key: string, value: string): boolean {
  return (
    !TECHNICAL_LITERAL_KEYS.has(key) &&
    hasEnglishWords(value) &&
    (!key.startsWith("literal.") || !isTechnicalLiteral(value))
  );
}

function foreignTokens(value: string): string[] {
  const visible = value.replace(/\{[^}]+}/g, "").replace(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g, "");
  return (visible.match(/\b[A-Za-z][A-Za-z-]*\b/g) ?? []).filter(
    (token) => !ALLOWED_FOREIGN_TOKENS.has(token),
  );
}

export function findLanguageLeaks(values: AuditDictionaries = dictionaries()): string[] {
  const problems: string[] = [];
  for (const [key, english] of Object.entries(values.en)) {
    if (!isUserFacingCopy(key, normalize(english))) continue;
    for (const lang of ["ru", "kk"] as const) {
      const translated = normalize(values[lang][key] ?? "");
      if (!translated) continue;
      const leaks = foreignTokens(translated);
      if (leaks.length) problems.push(`${lang}:${key}:${leaks.join(",")}`);
    }
  }
  return problems.sort();
}

export function findWrongLanguageLeaks(values: AuditDictionaries = dictionaries()): string[] {
  const problems: string[] = [];
  for (const [key, value] of Object.entries(values.en)) {
    if (/[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/.test(value)) problems.push(`en:${key}`);
  }
  for (const [key, value] of Object.entries(values.ru)) {
    if (/[ӘәҒғҚқҢңӨөҰұҮүҺһІі]/.test(value)) problems.push(`ru:${key}`);
  }
  for (const [key, value] of Object.entries(values.kk)) {
    const words = value.toLowerCase().match(/\p{L}+/gu) ?? [];
    if (/[ЁёЪъЬьЭэ]/.test(value) || words.some((word) => RUSSIAN_WORDS.has(word))) {
      problems.push(`kk:${key}`);
    }
  }
  return problems.sort();
}

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return entry.name.endsWith(".tsx") && !entry.name.includes(".test.") ? [file] : [];
  });
}

function tagName(node: ts.JsxElement | ts.JsxSelfClosingElement): string | null {
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  return ts.isIdentifier(opening.tagName) ? opening.tagName.text.toLowerCase() : null;
}

function isSkippedJsx(node: ts.Node): boolean {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (
      (ts.isJsxElement(parent) || ts.isJsxSelfClosingElement(parent)) &&
      SKIPPED_TAGS.has(tagName(parent) ?? "")
    ) {
      return true;
    }
  }
  return false;
}

function isUrl(value: string): boolean {
  return /^(?:https?:|mailto:|tel:|\/|#)|^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value);
}

function isHtmlEntity(value: string): boolean {
  return /^(?:…)?&(?:[a-z]+|#\d+|#x[\da-f]+);(?:…)?$/i.test(value);
}

function literalValue(node: ts.JsxAttribute): string | null {
  const initializer = node.initializer;
  if (!initializer) return null;
  if (ts.isStringLiteral(initializer)) return initializer.text;
  if (
    ts.isJsxExpression(initializer) &&
    initializer.expression &&
    ts.isStringLiteralLike(initializer.expression)
  ) {
    return initializer.expression.text;
  }
  return null;
}

function isDictionaryLiteral(
  value: string,
  english: Map<string, string[]>,
  values: AuditDictionaries,
): boolean {
  const normalized = normalize(value);
  if (
    normalized === "QuestCampus" ||
    isUrl(normalized) ||
    isHtmlEntity(normalized) ||
    isTechnicalLiteral(normalized) ||
    !hasEnglishWords(normalized)
  )
    return true;
  return (english.get(normalized) ?? []).some(
    (key) =>
      normalize(values.ru[key] ?? "") !== normalized &&
      normalize(values.kk[key] ?? "") !== normalized,
  );
}

function report(file: string, source: ts.SourceFile, node: ts.Node, value: string): string {
  const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  return `${path.relative(ROOT, file).replaceAll("\\", "/")}:${line}:${normalize(value)}`;
}

function translationCall(node: ts.Expression): boolean {
  return (
    ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "t"
  );
}

function expressionLiteral(node: ts.Expression, source: ts.SourceFile): string | null {
  if (translationCall(node)) return null;
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isTemplateExpression(node)) return node.getText(source).slice(1, -1);
  return null;
}

export function findUnregisteredLiteralsInSource(
  sourceText: string,
  values: AuditDictionaries = dictionaries(),
  file = "fixture.tsx",
): string[] {
  const english = new Map<string, string[]>();
  for (const [key, value] of Object.entries(values.en)) {
    const normalized = normalize(value);
    if (!normalized) continue;
    english.set(normalized, [...(english.get(normalized) ?? []), key]);
  }
  const problems: string[] = [];
  const source = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node)) {
      const value = node.getText(source);
      if (normalize(value) && !isSkippedJsx(node) && !isDictionaryLiteral(value, english, values)) {
        problems.push(report(file, source, node, value));
      }
    }

    if (
      ts.isJsxAttribute(node) &&
      TRANSLATABLE_ATTRIBUTES.has(node.name.text) &&
      !isSkippedJsx(node.parent)
    ) {
      const value = literalValue(node);
      if (value && !isDictionaryLiteral(value, english, values))
        problems.push(report(file, source, node, value));
    }

    const parentAttribute = node.parent && ts.isJsxAttribute(node.parent) ? node.parent : null;
    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      !isSkippedJsx(node) &&
      parentAttribute &&
      RENDERED_COPY_PROPS.has(parentAttribute.name.text)
    ) {
      const value = expressionLiteral(node.expression, source);
      if (value && !isDictionaryLiteral(value, english, values)) {
        problems.push(report(file, source, node, value));
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(source);

  return problems.sort();
}

export function findUnregisteredLiterals(): string[] {
  const values = dictionaries();
  return sourceFiles(SRC_ROOT)
    .filter((file) => !file.startsWith(path.join(SRC_ROOT, "lib", "i18n")))
    .flatMap((file) =>
      findUnregisteredLiteralsInSource(fs.readFileSync(file, "utf8"), values, file),
    )
    .sort();
}
