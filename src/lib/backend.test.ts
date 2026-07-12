import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveConvexClientUrl,
  resolveConvexSiteUrl,
  resolvePasswordResetUrl,
} from "./backend";

describe("backend URL resolution", () => {
  it("uses explicit self-host HTTP action origin when present", () => {
    const env = {
      VITE_CONVEX_URL: "https://convex.questcampus.space/",
      VITE_CONVEX_SITE_URL: "https://api.questcampus.space/",
    };

    assert.equal(resolveConvexClientUrl(env), "https://convex.questcampus.space");
    assert.equal(resolveConvexSiteUrl(env), "https://api.questcampus.space");
  });

  it("derives self-host HTTP action origin from convex host", () => {
    assert.equal(
      resolveConvexSiteUrl({
        VITE_CONVEX_URL: "https://convex.questcampus.space",
      }),
      "https://api.questcampus.space",
    );
    assert.equal(
      resolveConvexSiteUrl({
        VITE_CONVEX_URL: "https://convex-dev.questcampus.space",
      }),
      "https://api-dev.questcampus.space",
    );
  });

  it("keeps Convex Cloud .cloud to .site fallback for previews", () => {
    assert.equal(
      resolveConvexSiteUrl({
        VITE_CONVEX_URL: "https://perceptive-moose-422.eu-west-1.convex.cloud",
      }),
      "https://perceptive-moose-422.eu-west-1.convex.site",
    );
  });

  it("throws clear error when client URL is missing", () => {
    assert.throws(() => resolveConvexClientUrl({}), /VITE_CONVEX_URL is not set/);
  });

  it("uses the dedicated password-reset edge URL without changing other API bases", () => {
    const env = {
      VITE_CONVEX_URL: "https://convex.questcampus.space",
      VITE_CONVEX_SITE_URL: "https://api.questcampus.space",
      VITE_PASSWORD_RESET_URL: "https://auth.questcampus.space/",
    };

    assert.equal(resolvePasswordResetUrl(env), "https://auth.questcampus.space");
    assert.equal(resolveConvexSiteUrl(env), "https://api.questcampus.space");
  });
});
