import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("blocked target copy has an i18n translator in scope", () => {
  const source = readFileSync(join(process.cwd(), "src/routes/agent.tsx"), "utf8");
  const panel = source.slice(
    source.indexOf("function TargetReadinessPanel"),
    source.indexOf("function RecommendationPanel"),
  );

  assert.match(panel, /const \{ t \} = useI18n\(\);/);
});
