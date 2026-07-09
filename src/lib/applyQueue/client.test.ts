import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyJobIdFromStartResult } from "./client";

describe("apply queue client helpers", () => {
  it("extracts route-safe job id from startApply result", () => {
    assert.equal(
      applyJobIdFromStartResult({ jobId: "job_123", reused: true }),
      "job_123",
    );
  });
});
