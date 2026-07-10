export const CHAT_PAGE_CONTEXT_KEY = "qc.chat.pageContextEnabled";
export const CHAT_PAGE_CONTEXT_EVENT = "qc:chat-page-context";

const PAGE_REFERENCE_RE =
  /\b(this|that|these|those|here|onscreen|on-screen|screen|shown|above|below|current page|this page|that page|what i see|i see|visible|card|button|field|form)\b/i;

/**
 * Build a one-line page-context hint the agent can use to ground its reply.
 * Returns "" for routes where a location adds no signal (landing, sign-in).
 * Shape: `[Context: on <pathname>[, viewing <name>]]`
 */
export function pageContextLine(pathname: string, search: Record<string, unknown>): string {
  const path = (pathname || "/").replace(/\/+$/, "") || "/";
  const skip = new Set(["/", "/signin", "/oauth/callback", "/onboarding", "/tos", "/blank"]);
  if (skip.has(path)) return "";
  const segs = path.split("/").filter(Boolean);
  let entity: string | undefined;
  if (segs[0] === "application" && segs[1] && segs[2]) {
    entity = `${decodeURIComponent(segs[2])} (${segs[1]})`;
  }
  const q = typeof search.q === "string" ? search.q : undefined;
  const name = typeof search.name === "string" ? search.name : undefined;
  if (!entity && (name || q)) entity = name || q;
  return `[Context: on ${path}${entity ? `, viewing ${entity}` : ""}]`;
}

export function readChatPageContextEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CHAT_PAGE_CONTEXT_KEY) === "1";
}

export function writeChatPageContextEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAT_PAGE_CONTEXT_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new CustomEvent(CHAT_PAGE_CONTEXT_EVENT, { detail: { enabled } }));
}

export function shouldAttachPageContext(message: string, settingEnabled: boolean): boolean {
  if (settingEnabled) return true;
  return PAGE_REFERENCE_RE.test(message);
}

export function userVisibleChatContent(content: string): string {
  return content
    .replace(/^\[Context:[^\n]*\]\n+/g, "")
    .replace(/^\[Attached file saved to documents: (.+?) as ([^\]\n]+)\]\n?/g, "Attached $1 ($2)\n")
    .replace(/^\[Attached: (.+?) as ([^\]\n]+)\]\n?/g, "Attached $1 ($2)\n")
    .trimEnd();
}
