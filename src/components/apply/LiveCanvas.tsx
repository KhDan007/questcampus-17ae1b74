"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MonitorOff } from "lucide-react";

type Props = {
  wsEndpoint: string | undefined;
  ticket: string | undefined;
  /** When false, input events are not forwarded. */
  interactive?: boolean;
  /** When true, force-close the socket (e.g. terminal job status). */
  disconnect?: boolean;
  /** Called with the CloseEvent code so parent can re-fetch ticket on 1006/1008. */
  onClose?: (code: number) => void;
};

const SRC_W = 1280;
const SRC_H = 800;

/**
 * Renders the worker browser screencast and forwards mouse / wheel / keyboard
 * events back over the WebSocket. Coordinates are scaled to the 1280×800 source.
 */
export function LiveCanvas({
  wsEndpoint,
  ticket,
  interactive = true,
  disconnect = false,
  onClose,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "open" | "closed" | "error">(
    "idle",
  );
  const [hasFrame, setHasFrame] = useState(false);

  // Connect WS
  useEffect(() => {
    if (!wsEndpoint || !ticket || disconnect) return;
    setStatus("connecting");
    setHasFrame(false);

    const url = `${wsEndpoint}${wsEndpoint.includes("?") ? "&" : "?"}ticket=${encodeURIComponent(ticket)}`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      setStatus("error");
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => setStatus("open");
    ws.onerror = () => setStatus("error");
    ws.onclose = (ev) => {
      setStatus("closed");
      onClose?.(ev.code);
    };

    ws.onmessage = (e) => {
      let msg: { t?: string; data?: string } | null = null;
      try {
        msg = JSON.parse(e.data as string);
      } catch {
        return;
      }
      if (!msg || msg.t !== "frame" || !msg.data) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasFrame(true);
      };
      img.src = `data:image/jpeg;base64,${msg.data}`;
    };

    return () => {
      try {
        ws.close();
      } catch {
        /* noop */
      }
      wsRef.current = null;
    };
  }, [wsEndpoint, ticket]);

  // Scale page-coords -> source canvas coords (1280×800)
  function toSource(ev: { clientX: number; clientY: number }): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const x = ((ev.clientX - rect.left) / rect.width) * SRC_W;
    const y = ((ev.clientY - rect.top) / rect.height) * SRC_H;
    return {
      x: Math.max(0, Math.min(SRC_W, Math.round(x))),
      y: Math.max(0, Math.min(SRC_H, Math.round(y))),
    };
  }

  function send(msg: Record<string, unknown>) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(msg));
  }

  // Mouse + wheel
  const focus = () => canvasRef.current?.focus();

  function buttonName(b: number): "left" | "middle" | "right" {
    return b === 1 ? "middle" : b === 2 ? "right" : "left";
  }

  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border-2 border-on-surface bg-black qc-hard-shadow">
      <canvas
        ref={canvasRef}
        width={SRC_W}
        height={SRC_H}
        tabIndex={interactive ? 0 : -1}
        className={`block h-full w-full ${interactive ? "cursor-crosshair outline-none" : "pointer-events-none"}`}
        onMouseDown={(e) => {
          if (!interactive) return;
          focus();
          const p = toSource(e);
          if (!p) return;
          send({
            t: "mouse",
            type: "mousePressed",
            x: p.x,
            y: p.y,
            button: buttonName(e.button),
            clickCount: e.detail || 1,
          });
        }}
        onMouseUp={(e) => {
          if (!interactive) return;
          const p = toSource(e);
          if (!p) return;
          send({
            t: "mouse",
            type: "mouseReleased",
            x: p.x,
            y: p.y,
            button: buttonName(e.button),
            clickCount: e.detail || 1,
          });
        }}
        onMouseMove={(e) => {
          if (!interactive) return;
          const p = toSource(e);
          if (!p) return;
          send({ t: "mouse", type: "mouseMoved", x: p.x, y: p.y });
        }}
        onContextMenu={(e) => e.preventDefault()}
        onWheel={(e) => {
          if (!interactive) return;
          const p = toSource(e);
          if (!p) return;
          send({ t: "wheel", x: p.x, y: p.y, deltaX: e.deltaX, deltaY: e.deltaY });
        }}
        onCompositionEnd={(e) => {
          if (!interactive) return;
          const text = e.data;
          if (text) send({ t: "key", type: "char", text });
        }}
        onKeyDown={(e) => {
          if (!interactive) return;
          // Ignore composing keystrokes (IME): the composition handler covers them.
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          e.preventDefault();
          const isPrintable =
            e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
          if (isPrintable) {
            // Send exactly ONE char event — never double up with keyDown text.
            send({ t: "key", type: "char", text: e.key });
            return;
          }
          send({
            t: "key",
            type: "keyDown",
            key: e.key,
            code: e.code,
            keyCode: e.keyCode,
          });
        }}
        onKeyUp={(e) => {
          if (!interactive) return;
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          const isPrintable =
            e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
          if (isPrintable) return; // no keyUp for printable chars (char event already delivered)
          e.preventDefault();
          send({
            t: "key",
            type: "keyUp",
            key: e.key,
            code: e.code,
            keyCode: e.keyCode,
          });
        }}
      />

      {(!hasFrame || status !== "open") && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
          {status === "error" || status === "closed" ? (
            <>
              <MonitorOff className="h-6 w-6" />
              <p className="text-label-md">Live view disconnected</p>
            </>
          ) : (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-label-md">
                {wsEndpoint ? "Connecting to live browser…" : "Waiting for the agent to start…"}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
