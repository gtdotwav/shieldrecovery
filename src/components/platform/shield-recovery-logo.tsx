import Image from "next/image";

import { cn } from "@/lib/utils";

type ShieldRecoveryLogoProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  mode?: "stacked" | "inline" | "icon";
  size?: "sm" | "md" | "lg";
  emphasis?: "default" | "strong";
};

const LOGO_SRC = "/brand/shield-recovery-logo.png";
const LOGO_WIDTH = 669;
const LOGO_HEIGHT = 373;

export function ShieldRecoveryLogo({
  className,
  iconClassName,
  textClassName,
  mode = "inline",
  size = "md",
  emphasis = "default",
}: ShieldRecoveryLogoProps) {
  const inlineSizeClass =
    size === "sm" ? "h-10 sm:h-11" : size === "lg" ? "h-14 sm:h-16" : "h-11 sm:h-12";
  const stackedWidthClass =
    size === "sm"
      ? "w-[min(20rem,68vw)]"
      : size === "lg"
        ? "w-[min(30rem,82vw)]"
        : "w-[min(24rem,72vw)]";
  const inlineFrameClass =
    emphasis === "strong"
      ? "rounded-[1.15rem] border border-orange-500/18 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,245,238,0.96))] px-3 py-2 shadow-[0_18px_45px_rgba(249,115,22,0.14)] ring-1 ring-white/70"
      : "";
  const imageGlowClass =
    emphasis === "strong"
      ? "drop-shadow-[0_0_26px_rgba(255,106,0,0.22)]"
      : "drop-shadow-[0_0_20px_rgba(255,106,0,0.1)]";

  if (mode === "icon") {
    return (
      <LogoMark
        className={cn(
          size === "lg" ? "h-14 w-14" : size === "sm" ? "h-10 w-10" : "h-11 w-11",
          iconClassName,
          className,
        )}
      />
    );
  }

  if (mode === "stacked") {
    return (
      <div className={cn("inline-flex items-center justify-center", className)}>
        <Image
          src={LOGO_SRC}
          alt="Shield Recovery"
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          priority
          sizes="(max-width: 640px) 78vw, 30rem"
          className={cn(
            `h-auto ${stackedWidthClass} ${imageGlowClass}`,
            textClassName,
          )}
        />
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center", inlineFrameClass, className)}>
      <Image
        src={LOGO_SRC}
        alt="Shield Recovery"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        priority
        sizes="(max-width: 640px) 14rem, 18rem"
        className={cn(`w-auto ${inlineSizeClass} ${imageGlowClass}`, textClassName)}
      />
    </div>
  );
}

function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1rem] border border-black/10 bg-white shadow-[0_18px_44px_rgba(0,0,0,0.08)]",
        className,
      )}
      aria-label="Shield Recovery logo"
      role="img"
    >
      <Image
        src={LOGO_SRC}
        alt=""
        fill
        sizes="44px"
        className="object-contain object-left scale-[1.85] drop-shadow-[0_0_14px_rgba(255,106,0,0.18)]"
      />
    </div>
  );
}
