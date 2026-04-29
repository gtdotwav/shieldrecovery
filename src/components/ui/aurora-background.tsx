"use client";

import type { ReactNode } from "react";

type AuroraBackgroundProps = {
  children: ReactNode;
  className?: string;
  /** Reduce motion automatically when the user prefers it */
  showRadialGradient?: boolean;
};

/**
 * CSS-only animated aurora background — no framer-motion dependency.
 * Designed to lift hero sections and "premium" CTAs without paying the
 * bundle cost of a full animation library. Respects prefers-reduced-motion.
 */
export function AuroraBackground({
  children,
  className = "",
  showRadialGradient = true,
}: AuroraBackgroundProps) {
  return (
    <div
      className={`relative isolate overflow-hidden bg-white text-slate-900 dark:bg-[#070707] dark:text-white ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 motion-safe:animate-aurora opacity-50"
        style={{
          background:
            "linear-gradient(115deg, color-mix(in oklab, var(--accent) 28%, transparent) 0%, color-mix(in oklab, var(--accent) 12%, transparent) 30%, transparent 60%), linear-gradient(245deg, color-mix(in oklab, var(--accent) 22%, transparent) 0%, transparent 50%)",
          filter: "blur(60px) saturate(1.2)",
          backgroundSize: "200% 200%",
        }}
      />
      {showRadialGradient && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 0%, color-mix(in oklab, var(--accent) 10%, transparent) 0%, transparent 70%)",
          }}
        />
      )}
      <div className="relative z-10">{children}</div>

      <style jsx>{`
        @keyframes aurora {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        :global(.motion-safe\\:animate-aurora) {
          animation: aurora 18s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.motion-safe\\:animate-aurora) {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
