// Frontend payments client. Card data NEVER touches our code — third-party-hosted
// checkout only. Entitlement is granted ONLY by the backend webhook; this
// module just kicks off the checkout redirect.

function siteBase(): string {
  const explicit = import.meta.env.VITE_CONVEX_SITE_URL;
  const cloud = import.meta.env.VITE_CONVEX_URL;
  const url = explicit ?? cloud?.replace(".convex.cloud", ".convex.site");
  if (!url) throw new Error("VITE_CONVEX_URL is not set");
  return url.replace(/\/$/, "");
}

export type CheckoutResult =
  | { kind: "redirect"; url: string; discountPercent?: number }
  | { kind: "already_paid" }
  | { kind: "unauthorized" }
  | { kind: "not_configured" }
  | { kind: "error"; message: string };

export async function startCheckout(token: string | undefined): Promise<CheckoutResult> {
  if (!token) return { kind: "unauthorized" };
  let res: Response;
  try {
    res = await fetch(`${siteBase()}/api/payments/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: "{}",
    });
  } catch (e) {
    return { kind: "error", message: e instanceof Error ? e.message : "Network error" };
  }

  if (res.status === 401) return { kind: "unauthorized" };
  if (res.status === 503) return { kind: "not_configured" };

  let body: { url?: string; alreadyPaid?: boolean; error?: string; discountPercent?: number } = {};
  try {
    body = await res.json();
  } catch {
    /* ignore */
  }

  if (res.status === 403 && body.error === "email_not_verified") {
    const { requestEmailVerification } = await import("@/lib/auth/client");
    requestEmailVerification();
    return { kind: "error", message: "Please verify your email to continue." };
  }

  if (!res.ok) {
    return { kind: "error", message: body.error ?? `Checkout failed (${res.status})` };
  }
  if (body.alreadyPaid) return { kind: "already_paid" };
  if (body.url) return { kind: "redirect", url: body.url, discountPercent: body.discountPercent };
  return { kind: "error", message: "Unexpected response from checkout." };
}
