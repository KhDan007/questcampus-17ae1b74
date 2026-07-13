import assert from "node:assert/strict";
import test from "node:test";

import {
  findEnglishFallbacks,
  findLanguageLeaks,
  findMissingTranslations,
  findUnregisteredLiterals,
  findUnregisteredLiteralsInSource,
  findWrongLanguageLeaks,
} from "./translationAudit";

test("Russian and Kazakh dictionaries cover every English translation", () => {
  assert.deepEqual(findMissingTranslations(), []);
  assert.deepEqual(findEnglishFallbacks(), []);
});

test("rendered JSX copy is registered with distinct Russian and Kazakh translations", () => {
  assert.deepEqual(findUnregisteredLiterals(), []);
});

test("audit rejects missing, English-fallback, and wrong-language dictionary values", () => {
  const dictionaries = {
    en: { greeting: "Welcome" },
    ru: { greeting: "Welcome" },
    kk: {},
  };

  assert.deepEqual(findMissingTranslations(dictionaries), ["kk:greeting"]);
  assert.deepEqual(findEnglishFallbacks(dictionaries), ["ru:greeting"]);
  assert.deepEqual(findLanguageLeaks(dictionaries), ["ru:greeting:Welcome"]);
});

test("audit rejects Russian copy in English and Russian stop-words in Kazakh", () => {
  const dictionaries = {
    en: { greeting: "Привет" },
    ru: { greeting: "Привет" },
    kk: { greeting: "Привет" },
  };

  assert.deepEqual(findWrongLanguageLeaks(dictionaries), ["en:greeting", "kk:greeting"]);
});

test("audit permits localized attributes but rejects English JSX expression templates", () => {
  const dictionaries = {
    en: { label: "Remove image" },
    ru: { label: "Удалить изображение" },
    kk: { label: "Суретті жою" },
  };
  const localized = `<button aria-label="Remove image">{t("label")}</button>`;
  const leakedTemplate = `<Card body={\`Join the waitlist for \${discount}% off\`} />`;

  assert.deepEqual(findUnregisteredLiteralsInSource(localized, dictionaries), []);
  assert.deepEqual(findUnregisteredLiteralsInSource(leakedTemplate, dictionaries), [
    "fixture.tsx:1:Join the waitlist for ${discount}% off",
  ]);
});
