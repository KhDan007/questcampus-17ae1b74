"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";

type Variant = "pill" | "icon";

export function SaveToggle({
  saved,
  onAdd,
  onRemove,
  variant = "pill",
  className = "",
}: {
  saved: boolean;
  onAdd: () => void | Promise<void>;
  onRemove: () => void | Promise<void>;
  variant?: Variant;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handle() {
    if (busy) return;
    setBusy(true);
    try {
      if (saved) await onRemove();
      else await onAdd();
    } catch (e) {
      console.error("SaveToggle failed", e);
    } finally {
      setBusy(false);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handle}
        aria-pressed={saved}
        aria-label={saved ? "Remove from My universities" : "Save to My universities"}
        className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${
          saved
            ? "bg-primary-fixed text-primary"
            : "border border-on-surface/15 bg-surface text-on-surface hover:bg-on-surface/5"
        } ${className}`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <BookmarkCheck className="h-4 w-4" />
        ) : (
          <Bookmark className="h-4 w-4" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      aria-pressed={saved}
      className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-4 text-label-md font-semibold transition-colors ${
        saved
          ? "bg-primary-fixed text-primary"
          : "border border-on-surface/15 bg-surface text-on-surface hover:bg-on-surface/5"
      } ${className}`}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : saved ? (
        <BookmarkCheck className="h-4 w-4" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
      {saved ? "Saved" : "Add to my list"}
    </button>
  );
}
