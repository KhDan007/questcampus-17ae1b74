import assert from "node:assert/strict";
import test from "node:test";

import {
  findEnglishFallbacks,
  findMissingTranslations,
  findUnregisteredLiterals,
} from "./translationAudit";

test("Russian and Kazakh dictionaries cover every English translation", () => {
  assert.deepEqual(findMissingTranslations(), []);
  assert.deepEqual(findEnglishFallbacks(), []);
});

test("rendered JSX copy is registered with distinct Russian and Kazakh translations", () => {
  assert.deepEqual(findUnregisteredLiterals(), []);
});
