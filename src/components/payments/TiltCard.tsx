"use client";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Retained for API compatibility; no longer used (calm design drops the tilt). */
  maxTilt?: number;
};

/**
 * Calm surface wrapper. The original 3D cursor-tilt + spotlight + glow was
 * decorative motion, which the calm design removes — this is now a plain,
 * static container that preserves the same props so callers are unchanged.
 */
export function TiltCard({ children, className }: Props) {
  return <div className={className}>{children}</div>;
}
