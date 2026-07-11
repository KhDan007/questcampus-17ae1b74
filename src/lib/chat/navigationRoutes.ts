export const APPLICATION_STRENGTH_ROUTE = "/apply/strength" as const;

const APPLICATION_WORKSPACE_REDIRECTS = new Set([
  "/profile",
  "/common-app",
  "/essay",
  "/documents",
  "/prep",
]);

const ALLOWED_ROUTE_PATTERNS = [
  /^\/dashboard$/,
  /^\/apply(?:\/strength|\/[^/?#]+)?$/,
  /^\/universities(?:\?.*)?$/,
  /^\/extension$/,
  /^\/feedback(?:\?source=chatbot)?$/,
  /^\/plan$/,
  /^\/agent$/,
  /^\/unlock$/,
  /^\/application\/[^/]+\/[^/]+$/,
];

export function normalizeAssistantRoute(rawRoute: string | null | undefined): string | null {
  if (typeof rawRoute !== "string") return null;
  const route = rawRoute.trim();
  if (!route || !route.startsWith("/") || route.startsWith("//")) return null;
  const path = route.split("?")[0] ?? route;
  if (APPLICATION_WORKSPACE_REDIRECTS.has(path)) return "/apply";
  if (!ALLOWED_ROUTE_PATTERNS.some((pattern) => pattern.test(route))) return null;
  return route;
}

export function assistantRouteToastLabel(route: string | null | undefined): string {
  const normalized = normalizeAssistantRoute(route) ?? (typeof route === "string" ? route : "");
  if (normalized === APPLICATION_STRENGTH_ROUTE) return "Opening application strength";
  if (normalized === "/apply") return "Opening applications";
  if (normalized.startsWith("/universities")) return "Opening universities";
  if (normalized === "/extension") return "Opening extension install";
  if (normalized.startsWith("/feedback")) return "Opening feedback";
  if (normalized === "/plan") return "Opening plan";
  if (normalized === "/agent") return "Opening agent";
  return "Opening page";
}
