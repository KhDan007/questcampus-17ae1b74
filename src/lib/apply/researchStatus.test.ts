import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { researchStatusView } from "./researchStatus";

describe("researchStatusView", () => {
  it("shows a loading state while the Convex query is unresolved", () => {
    assert.deepEqual(researchStatusView(undefined), {
      tone: "loading",
      label: "Checking research",
      detail: "Connecting to the backend for the latest portal status.",
      percent: null,
    });
  });

  it("shows a queued state before the background job has reported progress", () => {
    assert.equal(researchStatusView(null).tone, "queued");
    assert.match(researchStatusView(null).detail, /save/i);
  });

  it("clamps backend progress percentages", () => {
    const view = researchStatusView({
      status: "researching_deep",
      progress: { message: "Reading portal", percent: 124 },
    });
    assert.equal(view.tone, "researching");
    assert.equal(view.detail, "Reading portal");
    assert.equal(view.percent, 100);
  });

  it("treats paywalled and error states as non-fatal", () => {
    assert.equal(researchStatusView({ status: "paywalled", progress: null }).tone, "blocked");
    assert.match(researchStatusView({ status: "error", progress: null, error: "Boom" }).detail, /public/i);
  });

  it("labels partial coverage distinctly from full ready coverage", () => {
    const partial = researchStatusView({
      status: "ready",
      coverage: "partial",
      progress: null,
    });
    const full = researchStatusView({
      status: "ready",
      coverage: "full",
      progress: null,
    });
    assert.equal(partial.label, "Partial requirements ready");
    assert.equal(full.label, "Requirements ready");
  });
});
