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
        className={`grid h-9 w-9 place-items-center rounded-md border-2 border-on-surface transition-all qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none ${
          saved ? "bg-primary text-white" : "bg-surface text-on-surface"
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
      className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-4 text-label-md font-medium transition-colors ${
        saved
          ? "border-primary bg-primary-container text-on-primary"
          : "border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:bg-surface-container"
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
