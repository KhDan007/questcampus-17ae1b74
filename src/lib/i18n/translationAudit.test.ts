import assert from "node:assert/strict";
import test from "node:test";
import en from "./generated/en.json";
import kk from "./generated/kk.json";
import ru from "./generated/ru.json";

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
  assert.deepEqual(findLanguageLeaks(), []);
  assert.deepEqual(findWrongLanguageLeaks(), []);
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

test("audit rejects Russian copy in English and Russian UI tokens in Kazakh", () => {
  const dictionaries = {
    en: { greeting: "Привет" },
    ru: { greeting: "Привет" },
    kk: { greeting: "Привет" },
  };

  assert.deepEqual(findWrongLanguageLeaks(dictionaries), ["en:greeting", "kk:greeting:привет"]);
});

test("audit rejects generic English leaks and Russian UI copy without rejecting Kazakh Cyrillic", () => {
  const foreignCopy = {
    en: {
      anywhere: "Anywhere",
      backend: "Backend unavailable",
      gap: "Gap year",
      live: "Live browser",
      waitlist: "Waitlist pricing",
    },
    ru: {
      anywhere: "Anywhere",
      backend: "Backend недоступен",
      gap: "Gap year",
      live: "Live browser",
      waitlist: "Waitlist-цены",
    },
    kk: {
      anywhere: "Anywhere",
      backend: "Backend қолжетімсіз",
      gap: "Gap year",
      live: "Live browser",
      waitlist: "Waitlist бағасы",
    },
  };

  assert.deepEqual(findLanguageLeaks(foreignCopy), [
    "kk:anywhere:Anywhere",
    "kk:backend:Backend",
    "kk:gap:Gap,year",
    "kk:live:Live,browser",
    "kk:waitlist:Waitlist",
    "ru:anywhere:Anywhere",
    "ru:backend:Backend",
    "ru:gap:Gap,year",
    "ru:live:Live,browser",
    "ru:waitlist:Waitlist",
  ]);

  assert.deepEqual(
    findWrongLanguageLeaks({
      en: { continue: "Continue", select: "Select", settings: "Settings", validKazakh: "Kazakh" },
      ru: {},
      kk: {
        continue: "Продолжить",
        select: "Выберите",
        settings: "Настройки",
        validKazakh: "Баптауларды таңдаңыз",
      },
    }),
    ["kk:continue:продолжить", "kk:select:выберите", "kk:settings:настройки"],
  );
});

test("actual Kazakh dictionary mutations cannot self-whitelist Russian UI copy", () => {
  const mutatedKazakh = {
    ...kk,
    "test.russianInjection": "Настройки Продолжить Выберите Ошибка Готово Загрузка",
  };

  assert.deepEqual(
    findWrongLanguageLeaks({ en, ru, kk: mutatedKazakh }).filter((problem) => problem.startsWith("kk:test.")),
    ["kk:test.russianInjection:настройки,продолжить,выберите,ошибка,готово,загрузка"],
  );
});

test("audit permits full institution names but rejects isolated English institution terms", () => {
  const dictionaries = {
    en: { sciences: "Sciences", sciencesPo: "Sciences Po", university: "University" },
    ru: { sciences: "Sciences", sciencesPo: "Sciences Po", university: "University" },
    kk: { sciences: "Sciences", sciencesPo: "Sciences Po", university: "University" },
  };

  assert.deepEqual(findLanguageLeaks(dictionaries), [
    "kk:sciences:Sciences",
    "kk:university:University",
    "ru:sciences:Sciences",
    "ru:university:University",
  ]);
});

test("audit permits localized attributes but rejects English JSX expression templates", () => {
  const dictionaries = {
    en: { label: "Remove image" },
    ru: { label: "Удалить изображение" },
    kk: { label: "Суретті жою" },
  };
  const localized = `<button aria-label="Remove image">{t("label")}</button>`;
  const leakedTemplate = `<Card body={\`Join the waitlist for \${discount}% off\`} />`;
  const leakedSubtitle = `<SectionHeading subtitle={\`Join the waitlist · \${discount}% off\`} />`;
  const leakedAccessibleLabel = `<div aria-label={\`\${score} out of 5\`} />`;

  assert.deepEqual(findUnregisteredLiteralsInSource(localized, dictionaries), []);
  assert.deepEqual(findUnregisteredLiteralsInSource(leakedTemplate, dictionaries), [
    "fixture.tsx:1:Join the waitlist for ${discount}% off",
  ]);
  assert.deepEqual(findUnregisteredLiteralsInSource(leakedSubtitle, dictionaries), [
    "fixture.tsx:1:Join the waitlist · ${discount}% off",
  ]);
  assert.deepEqual(findUnregisteredLiteralsInSource(leakedAccessibleLabel, dictionaries), [
    "fixture.tsx:1:${score} out of 5",
  ]);
});
