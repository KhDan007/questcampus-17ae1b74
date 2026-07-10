"use client";

// Global state for the docked chat panel. On desktop the panel is a REAL sidebar
// that shifts page content: this provider publishes a `--chat-dock-w` CSS var on
// <html> (the open panel's effective width, or 0), and the root layout adds that
// as right-padding so opening/resizing/collapsing the chat pushes the page
// instead of covering it. On mobile the var stays 0 (the panel is a full-screen
// sheet), so content is never shifted.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const DOCK_MIN_W = 320;
export const DOCK_MAX_W = 560;
export const DOCK_DEFAULT_W = 384;
export const DOCK_RAIL_W = 56;

const LS_W = "qc.chat.dock.width";
const LS_COLLAPSED = "qc.chat.dock.collapsed";

type ChatDockValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  width: number;
  setWidth: (v: number) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  isDesktop: boolean;
};

const Ctx = createContext<ChatDockValue | null>(null);

export function useChatDock(): ChatDockValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useChatDock must be used within a ChatDockProvider");
  return v;
}

export function ChatDockProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [width, setWidthState] = useState(DOCK_DEFAULT_W);
  const [collapsed, setCollapsedState] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Hydrate persisted width/collapsed + track the desktop breakpoint.
  useEffect(() => {
    try {
      const w = Number(localStorage.getItem(LS_W));
      if (Number.isFinite(w) && w >= DOCK_MIN_W && w <= DOCK_MAX_W) setWidthState(w);
      setCollapsedState(localStorage.getItem(LS_COLLAPSED) === "1");
    } catch {
      // localStorage may be unavailable (private browsing) — non-critical.
    }
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setWidth = (v: number) => {
    const clamped = Math.max(DOCK_MIN_W, Math.min(DOCK_MAX_W, Math.round(v)));
    setWidthState(clamped);
    try {
      localStorage.setItem(LS_W, String(clamped));
    } catch {
      // non-critical
    }
  };

  const setCollapsed = (v: boolean) => {
    setCollapsedState(v);
    try {
      localStorage.setItem(LS_COLLAPSED, v ? "1" : "0");
    } catch {
      // non-critical
    }
  };

  // Shift the page by the effective dock width (desktop + open only). We set a
  // concrete px padding-right on <body> directly rather than a CSS var, because
  // var() in padding didn't resolve reliably in this build. Fixed elements
  // (header, the panel) are viewport-anchored and unaffected.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const w = isDesktop && open ? (collapsed ? DOCK_RAIL_W : width) : 0;
    const body = document.body;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    body.style.transition = reduced ? "none" : "padding-right 0.25s ease-out";
    body.style.paddingRight = `${w}px`;
    // Also publish the var for any component that wants to read it.
    document.documentElement.style.setProperty("--chat-dock-w", `${w}px`);
    return () => {
      body.style.paddingRight = "0px";
    };
  }, [isDesktop, open, collapsed, width]);

  return (
    <Ctx.Provider value={{ open, setOpen, width, setWidth, collapsed, setCollapsed, isDesktop }}>
      {children}
    </Ctx.Provider>
  );
}
