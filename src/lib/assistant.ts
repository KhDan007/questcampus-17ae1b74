// Decoupled opener for the global AssistantSidebar. Any component can ask the
// assistant a seeded question without prop-drilling: it dispatches a window
// CustomEvent that the always-mounted AssistantSidebar listens for (opens the
// panel + auto-submits the prompt).

export const ASSISTANT_ASK_EVENT = "qc:assistant:ask";

export function askAssistant(prompt: string): void {
  if (typeof window === "undefined") return;
  const text = prompt.trim();
  if (!text) return;
  window.dispatchEvent(new CustomEvent(ASSISTANT_ASK_EVENT, { detail: { prompt: text } }));
}
