"use client";

import type { CSSProperties, ReactNode } from "react";

export function MagneticButton({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  strength?: number;
}) {
  return (
    <div
      className={`inline-block transition-transform hover:scale-[1.02] active:scale-[0.98] ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
