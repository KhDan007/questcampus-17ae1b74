type PublicEnv = {
  VITE_CONVEX_URL?: string;
  VITE_CONVEX_SITE_URL?: string;
  VITE_PASSWORD_RESET_URL?: string;
};

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function publicEnv(): PublicEnv {
  return import.meta.env as PublicEnv;
}

function deriveSiteUrl(clientUrl: string): string {
  if (clientUrl.includes(".convex.cloud")) {
    return clientUrl.replace(".convex.cloud", ".convex.site");
  }

  try {
    const url = new URL(clientUrl);
    if (url.hostname.startsWith("convex-dev.")) {
      url.hostname = url.hostname.replace(/^convex-dev\./, "api-dev.");
    } else if (url.hostname.startsWith("convex.")) {
      url.hostname = url.hostname.replace(/^convex\./, "api.");
    } else {
      url.hostname = url.hostname.replace("convex", "api");
    }
    return trimTrailingSlash(url.toString());
  } catch {
    return clientUrl.replace("convex", "api");
  }
}

export function resolveConvexClientUrl(env: PublicEnv = publicEnv()): string {
  const url = env.VITE_CONVEX_URL;
  if (!url) throw new Error("VITE_CONVEX_URL is not set");
  return trimTrailingSlash(url);
}

export function resolveConvexSiteUrl(env: PublicEnv = publicEnv()): string {
  const explicit = env.VITE_CONVEX_SITE_URL;
  if (explicit) return trimTrailingSlash(explicit);

  const clientUrl = resolveConvexClientUrl(env);
  return deriveSiteUrl(clientUrl);
}

export function resolvePasswordResetUrl(env: PublicEnv = publicEnv()): string {
  const explicit = env.VITE_PASSWORD_RESET_URL;
  return explicit ? trimTrailingSlash(explicit) : resolveConvexSiteUrl(env);
}
