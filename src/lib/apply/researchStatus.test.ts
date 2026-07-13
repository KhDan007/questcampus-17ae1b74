import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { researchStatusView, qualityStatusView } from "./researchStatus";

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

describe("qualityStatusView", () => {
  it("ready_to_fill is the only green state", () => {
    const v = qualityStatusView({ qualityStatus: "ready_to_fill", blockedReason: null });
    assert.equal(v.tone, "ready");
    assert.equal(v.percent, 100);
  });

  it("needs_research shows a calm researching state, not error", () => {
    const v = qualityStatusView({ qualityStatus: "needs_research", blockedReason: "partial_coverage" });
    assert.equal(v.tone, "researching");
  });

  it("needs_user_input asks for info", () => {
    const v = qualityStatusView({ qualityStatus: "needs_user_input", blockedReason: "missing_user_inputs" });
    assert.equal(v.tone, "partial");
  });

  it("unsupported is a manual-portal state", () => {
    const v = qualityStatusView({ qualityStatus: "unsupported", blockedReason: "national_portal" });
    assert.equal(v.tone, "blocked");
  });

  it("unknown status falls back to researching, never ready", () => {
    const v = qualityStatusView({ qualityStatus: "something_new" });
    assert.equal(v.tone, "researching");
  });
});
