"use client";

// English-only mode: this hook is now a passthrough. The previous
// implementation called a server fn to translate AI-generated copy into the
// user's language; we keep the same signature so call sites don't need edits.
export function useAutoTranslate(
  text: string | null | undefined,
): string | null {
  return text ?? null;
}

