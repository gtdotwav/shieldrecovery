import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Stretch to fill parent width on mobile, auto on >sm */
  fullWidth?: boolean;
};

const VARIANT_STYLES: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-[color:var(--accent-on)] hover:brightness-110 active:brightness-95 focus-visible:ring-[var(--accent)]/40 disabled:bg-[var(--accent)]/40",
  secondary:
    "bg-[var(--surface,_#f1f5f9)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--accent)]/8 focus-visible:ring-[var(--accent)]/30",
  ghost:
    "bg-transparent text-[var(--foreground)] hover:bg-[var(--accent)]/8 focus-visible:ring-[var(--accent)]/20",
  outline:
    "bg-transparent text-[var(--accent)] border border-[var(--accent)]/40 hover:bg-[var(--accent)]/8 focus-visible:ring-[var(--accent)]/30",
  danger:
    "bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-500/40 disabled:bg-rose-600/40",
};

const SIZE_STYLES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2 rounded-2xl",
};

const ICON_SIZE: Record<Size, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth,
    className = "",
    disabled,
    children,
    ...rest
  },
  ref,
) {
  const base =
    "inline-flex items-center justify-center font-semibold tracking-tight transition-[background,color,box-shadow,filter] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background,_white)] disabled:cursor-not-allowed";
  const width = fullWidth ? "w-full sm:w-auto" : "";

  return (
    <button
      ref={ref}
      className={`${base} ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${width} ${className}`.trim()}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading ? (
        <Loader2 className={`${ICON_SIZE[size]} animate-spin`} aria-hidden />
      ) : (
        leftIcon && <span className={ICON_SIZE[size]}>{leftIcon}</span>
      )}
      <span>{children}</span>
      {rightIcon && !isLoading && <span className={ICON_SIZE[size]}>{rightIcon}</span>}
    </button>
  );
});

export { Button };
export type { ButtonProps };
