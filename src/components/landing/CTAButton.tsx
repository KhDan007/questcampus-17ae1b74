"use client";

import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type Variant = "yellow" | "outline" | "blue" | "red" | "white" | "ghost";

export function CTAButton({
  href,
  children,
  variant = "yellow",
  className = "",
  onClick,
  type = "button",
  hoverScale: _hoverScale,
}: {
  href?: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  hoverScale?: number;
}) {
  const base = "bc-btn";
  const variantCls =
    variant === "outline" || variant === "ghost" || variant === "white"
      ? "bc-btn-outline"
      : variant === "blue"
        ? "bc-btn-blue"
        : variant === "red"
          ? "bc-btn-red"
          : "";
  const cls = `${base} ${variantCls} ${className}`.trim();

  if (href) {
    const isExternal = href.startsWith("http") || href.startsWith("#");
    if (isExternal) {
      return (
        <a href={href} className={cls}>
          {children}
        </a>
      );
    }
    return (
      <Link to={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
