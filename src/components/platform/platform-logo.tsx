import { CreditCard, Orbit } from "lucide-react";

import { platformBrand } from "@/lib/platform";
import { cn } from "@/lib/utils";

type PlatformLogoProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  mode?: "stacked" | "inline" | "icon";
  size?: "sm" | "md" | "lg";
  emphasis?: "default" | "strong";
};

export function PlatformLogo({
  className,
  iconClassName,
  textClassName,
  mode = "inline",
  size = "md",
  emphasis = "default",
}: PlatformLogoProps) {
  const frameClass =
    emphasis === "strong"
      ? "rounded-[1.15rem] border border-sky-500/16 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,249,255,0.94))] px-3 py-2 shadow-[0_18px_45px_rgba(14,116,144,0.12)] ring-1 ring-white/70"
      : "";
  const markSizeClass =
    size === "lg" ? "h-14 w-14" : size === "sm" ? "h-10 w-10" : "h-11 w-11";

  if (mode === "icon") {
    return (
      <LogoMark className={cn(markSizeClass, iconClassName, className)} />
    );
  }

  const content = (
    <>
      <LogoMark className={cn(markSizeClass, "shrink-0", iconClassName)} />
      <div className={cn("min-w-0", textClassName)}>
        <p
          className={cn(
            "text-[0.65rem] font-semibold uppercase tracking-[0.26em] text-sky-600",
            size === "lg" && "text-[0.7rem]",
          )}
        >
          White Label Recovery
        </p>
        <p
          className={cn(
            "text-lg font-semibold tracking-tight text-[#082f49]",
            size === "lg" ? "text-[1.45rem]" : size === "sm" ? "text-base" : "text-lg",
          )}
        >
          {platformBrand.name}
        </p>
      </div>
    </>
  );

  if (mode === "stacked") {
    return (
      <div className={cn("inline-flex flex-col items-start gap-3", className)}>
        <LogoMark className={cn(markSizeClass, iconClassName)} />
        <div className={cn("min-w-0", textClassName)}>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-sky-600">
            White Label Recovery
          </p>
          <p className="mt-1 text-[2rem] font-semibold tracking-tight text-[#082f49]">
            {platformBrand.name}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-3", frameClass, className)}>
      {content}
    </div>
  );
}

function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-[1rem] border border-sky-200/80 bg-[linear-gradient(145deg,#ffffff,#e0f2fe)] shadow-[0_18px_44px_rgba(8,47,73,0.12)]",
        className,
      )}
      aria-label={`${platformBrand.name} logo`}
      role="img"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.28),transparent_58%)]" />
      <Orbit className="absolute h-[72%] w-[72%] text-sky-300/70" strokeWidth={1.35} />
      <CreditCard className="relative h-[42%] w-[42%] text-sky-700" strokeWidth={2} />
    </div>
  );
}

