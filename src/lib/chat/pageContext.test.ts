import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CHAT_PAGE_CONTEXT_KEY,
  pageContextLine,
  shouldAttachPageContext,
  userVisibleChatContent,
} from "./pageContext";

test("page context is opt-in by default", () => {
  assert.equal(CHAT_PAGE_CONTEXT_KEY, "qc.chat.pageContextEnabled");
  assert.equal(shouldAttachPageContext("How strong is my app?", false), false);
});

test("page context is attached when the profile setting is enabled", () => {
  assert.equal(shouldAttachPageContext("How strong is my app?", true), true);
});

test("page context is attached for visible-page references even when disabled", () => {
  for (const message of [
    "What does this card mean?",
    "Where do I put these?",
    "Can you explain what I see here?",
    "Open the one shown above",
  ]) {
    assert.equal(shouldAttachPageContext(message, false), true, message);
  }
});

test("page context line skips low-signal public routes", () => {
  assert.equal(pageContextLine("/", {}), "");
  assert.equal(pageContextLine("/signin", {}), "");
});

test("page context line keeps application entity details", () => {
  assert.equal(
    pageContextLine("/application/commonapp/stanford", {}),
    "[Context: on /application/commonapp/stanford, viewing stanford (commonapp)]",
  );
});

test("hidden context and upload hints do not render as debug text in the chat", () => {
  assert.equal(
    userVisibleChatContent("[Context: on /apply]\nWhere do I put these?"),
    "Where do I put these?",
  );
  assert.equal(
    userVisibleChatContent("[Attached file saved to documents: transcript.pdf as transcript]\nReview it"),
    "Attached transcript.pdf (transcript)\nReview it",
  );
});
