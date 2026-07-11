import { test } from "node:test";
import assert from "node:assert/strict";

import {
  APPLICATION_STRENGTH_ROUTE,
  assistantRouteToastLabel,
  normalizeAssistantRoute,
} from "./navigationRoutes";

test("keeps application strength route", () => {
  assert.equal(normalizeAssistantRoute("/apply/strength"), APPLICATION_STRENGTH_ROUTE);
});

test("remaps legacy application gap routes to applications workspace", () => {
  for (const route of ["/profile", "/common-app", "/essay", "/documents", "/prep"]) {
    assert.equal(normalizeAssistantRoute(route), "/apply");
  }
});

test("rejects unsafe assistant navigation", () => {
  assert.equal(normalizeAssistantRoute("https://evil.com"), null);
  assert.equal(normalizeAssistantRoute("//evil.com"), null);
  assert.equal(normalizeAssistantRoute("/admin/secrets"), null);
  assert.equal(normalizeAssistantRoute("javascript:alert(1)"), null);
});

test("uses clear popup labels", () => {
  assert.equal(assistantRouteToastLabel("/apply/strength"), "Opening application strength");
  assert.equal(assistantRouteToastLabel("/apply"), "Opening applications");
});

// Regression: a malformed/null route on an action must not throw.
test("never throws on null/undefined route", () => {
  assert.equal(normalizeAssistantRoute(null as unknown as string), null);
  assert.equal(normalizeAssistantRoute(undefined as unknown as string), null);
  assert.equal(normalizeAssistantRoute(42 as unknown as string), null);
  assert.equal(assistantRouteToastLabel(null as unknown as string), "Opening page");
  assert.equal(assistantRouteToastLabel(undefined as unknown as string), "Opening page");
});
