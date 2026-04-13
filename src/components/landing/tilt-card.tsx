"use client";

import type { CSSProperties, ReactNode } from "react";

export function TiltCard({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`relative transition-transform hover:-translate-y-1 hover:shadow-xl ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
