"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ShineButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  size?: "md" | "lg";
};

/**
 * Premium "shine" CTA — uses a CSS gradient sweep (no framer-motion).
 * Targets pivotal moments: checkout commit, retry confirm, lead conversion.
 * Use sparingly so the effect keeps its weight.
 */
const ShineButton = forwardRef<HTMLButtonElement, ShineButtonProps>(function ShineButton(
  { children, size = "md", className = "", ...rest },
  ref,
) {
  const sizeClasses = size === "lg" ? "h-12 px-7 text-base" : "h-10 px-5 text-sm";

  return (
    <button
      ref={ref}
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-full font-semibold tracking-tight transition-[filter,transform] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 focus-visible:ring-offset-2 ${sizeClasses} ${className}`}
      style={{
        color: "var(--accent-on, white)",
        background:
          "linear-gradient(120deg, color-mix(in oklab, var(--accent) 100%, black 0%) 0%, color-mix(in oklab, var(--accent) 80%, white) 50%, color-mix(in oklab, var(--accent) 100%, black 0%) 100%)",
        backgroundSize: "200% 100%",
        backgroundPosition: "0% 0%",
        boxShadow: "0 12px 30px -6px color-mix(in oklab, var(--accent) 35%, transparent)",
      }}
      {...rest}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 motion-safe:animate-[shine_3.6s_linear_infinite]"
        style={{
          background:
            "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)",
          backgroundSize: "200% 100%",
          mixBlendMode: "overlay",
        }}
      />
      <style jsx>{`
        @keyframes shine {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          span[aria-hidden] {
            animation: none !important;
          }
        }
      `}</style>
    </button>
  );
});

export { ShineButton };
