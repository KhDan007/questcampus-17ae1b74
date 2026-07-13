import assert from "node:assert/strict";
import test from "node:test";
import { auth } from "./client";

process.env.VITE_PASSWORD_RESET_URL = "https://auth.example.test";

type CapturedRequest = {
  url: string;
  method?: string;
  body?: string | null;
};

async function captureRequest(run: () => Promise<unknown>): Promise<CapturedRequest> {
  const originalFetch = globalThis.fetch;
  let request: CapturedRequest | undefined;

  globalThis.fetch = (async (input, init) => {
    request = {
      url: String(input),
      method: init?.method,
      body: typeof init?.body === "string" ? init.body : null,
    };
    return new Response(JSON.stringify({ ok: true, message: "Accepted" }), { status: 200 });
  }) as typeof fetch;

  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.ok(request, "expected the auth client to issue a request");
  return request;
}

test("requestPasswordReset posts a normalized email to the reset endpoint", async () => {
  const request = await captureRequest(() => auth.requestPasswordReset(" Student@Example.COM "));

  assert.equal(request.method, "POST");
  assert.equal(request.url, "https://auth.example.test/api/auth/password-reset/request");
  assert.deepEqual(JSON.parse(request.body ?? "{}"), {
    email: "student@example.com",
    lang: "en",
  });
});

test("confirmPasswordReset posts a token and new password to the reset endpoint", async () => {
  const token = "a".repeat(43);
  const request = await captureRequest(() => auth.confirmPasswordReset(token, "new-password"));

  assert.equal(request.method, "POST");
  assert.equal(request.url, "https://auth.example.test/api/auth/password-reset/confirm");
  assert.deepEqual(JSON.parse(request.body ?? "{}"), {
    token,
    password: "new-password",
    lang: "en",
  });
});
