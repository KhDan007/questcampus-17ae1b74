import { test } from "node:test";
import assert from "node:assert/strict";

import { friendlyStepLabel, friendlyStepLabels } from "./stepLabels";

test("hides internal capability names from assistant activity", () => {
  assert.equal(friendlyStepLabel("Checked application_strength"), "Reviewed application strength");
  assert.equal(friendlyStepLabel("Checked chat_context"), "Read your application context");
  assert.equal(friendlyStepLabel("Updated set_answer"), "Saved your answer");
});

test("turns proposed tool names into normal activity", () => {
  assert.equal(friendlyStepLabel("Proposed navigate"), "Opened the right page");
  assert.equal(friendlyStepLabel("Proposed attach_document"), "Prepared a document");
  assert.equal(friendlyStepLabel("Proposed a job"), "Prepared a task");
});

test("dedupes and limits visible activity", () => {
  assert.deepEqual(
    friendlyStepLabels([
      "Checked chat_context",
      "Checked chat_context",
      "Checked application_strength",
      "Updated set_answer",
      "Updated set_answer",
    ]),
    ["Read your application context", "Reviewed application strength", "Saved your answer"],
  );
});
