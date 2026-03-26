"use client";

import type { ReactNode } from "react";

export function Marquee({
  children,
  speed = 35,
  className = "",
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  return (
    <div className={`group relative overflow-hidden ${className}`}>
      {/* Fade edges */}
      <div
        className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20"
        style={{
          background:
            "linear-gradient(to right, var(--bg-fade, #0a0a0a), transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20"
        style={{
          background:
            "linear-gradient(to left, var(--bg-fade, #0a0a0a), transparent)",
        }}
      />

      <div
        className="flex w-max animate-marquee group-hover:[animation-play-state:paused]"
        style={{ animationDuration: `${speed}s` }}
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
