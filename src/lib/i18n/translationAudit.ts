import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import en from "./generated/en.json";
import kk from "./generated/kk.json";
import ru from "./generated/ru.json";
import { AUDIT_TRANSLATIONS, TRANSLATIONS, type Dict } from "./translations";

type Dictionaries = Record<"en" | "ru" | "kk", Dict>;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SRC_ROOT = path.join(ROOT, "src");
const TRANSLATABLE_ATTRIBUTES = new Set([
  "aria-label",
  "aria-description",
  "title",
  "placeholder",
  "alt",
]);
const SKIPPED_TAGS = new Set(["svg", "code", "pre"]);

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function hasEnglishWords(value: string): boolean {
  const visible = value.replace(/\{[^}]+}/g, "");
  return /\b(?:[a-z]{2,}|[A-Z][a-z]+)\b/.test(visible);
}

function dictionaries(): Dictionaries {
  const english = { ...(en as Dict), ...TRANSLATIONS.en, ...AUDIT_TRANSLATIONS.en };
  return {
    en: english,
    ru: { ...english, ...(ru as Dict), ...TRANSLATIONS.ru, ...AUDIT_TRANSLATIONS.ru },
    kk: { ...english, ...(kk as Dict), ...TRANSLATIONS.kk, ...AUDIT_TRANSLATIONS.kk },
  };
}

export function findMissingTranslations(): string[] {
  const values = dictionaries();
  const problems: string[] = [];

  for (const key of Object.keys(values.en).sort()) {
    for (const lang of ["ru", "kk"] as const) {
      if (!normalize(values[lang][key] ?? "")) problems.push(`${lang}:${key}`);
    }
  }

  return problems;
}

export function findEnglishFallbacks(): string[] {
  const values = dictionaries();
  const problems: string[] = [];

  for (const [key, english] of Object.entries(values.en).sort(([a], [b]) => a.localeCompare(b))) {
    if (key.startsWith("literal.")) continue;
    const normalizedEnglish = normalize(english);
    if (!hasEnglishWords(normalizedEnglish)) continue;
    for (const lang of ["ru", "kk"] as const) {
      if (normalize(values[lang][key] ?? "") === normalizedEnglish) problems.push(`${lang}:${key}`);
    }
  }

  return problems;
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
  values: Dictionaries,
): boolean {
  const normalized = normalize(value);
  if (
    normalized === "QuestCampus" ||
    isUrl(normalized) ||
    isHtmlEntity(normalized) ||
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

export function findUnregisteredLiterals(): string[] {
  const values = dictionaries();
  const english = new Map<string, string[]>();
  for (const [key, value] of Object.entries(values.en)) {
    const normalized = normalize(value);
    if (!normalized) continue;
    english.set(normalized, [...(english.get(normalized) ?? []), key]);
  }
  const problems: string[] = [];

  for (const file of sourceFiles(SRC_ROOT)) {
    if (file.startsWith(path.join(SRC_ROOT, "lib", "i18n"))) continue;
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node: ts.Node): void => {
      if (ts.isJsxText(node)) {
        const value = node.getText(source);
        if (
          normalize(value) &&
          !isSkippedJsx(node) &&
          !isDictionaryLiteral(value, english, values)
        ) {
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

      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  return problems.sort();
}
