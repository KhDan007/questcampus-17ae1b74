import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { agentRunIdFromState } from "./portfolio";

describe("agentRunIdFromState", () => {
  it("prefers the active run returned by the current start click", () => {
    assert.equal(
      agentRunIdFromState({
        activeRunId: "active",
        roadmap: { agentRunId: "roadmap" },
        events: [{ runId: "event", createdAt: 3 }],
      }),
      "active",
    );
  });

  it("recovers a queued run from the newest event after reload", () => {
    assert.equal(
      agentRunIdFromState({
        activeRunId: null,
        roadmap: null,
        events: [
          { runId: "older", createdAt: 1 },
          { runId: "newer", createdAt: 5 },
        ],
      }),
      "newer",
    );
  });

  it("falls back to latest roadmap run id", () => {
    assert.equal(
      agentRunIdFromState({
        activeRunId: null,
        roadmap: { agentRunId: "roadmap" },
        events: [],
      }),
      "roadmap",
    );
  });
});
