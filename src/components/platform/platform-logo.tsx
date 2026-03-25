import { platformBrand } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { PagRecoveryMark } from "@/components/platform/pagrecovery-mark";

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
      ? "glass-panel rounded-[1.4rem] px-3.5 py-3 shadow-[0_24px_70px_rgba(0,0,0,0.32)]"
      : "";
  const markSizeClass =
    size === "lg" ? "h-16 w-[3.3rem]" : size === "sm" ? "h-10 w-[2.05rem]" : "h-12 w-[2.45rem]";

  if (mode === "icon") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <PagRecoveryMark className={cn(markSizeClass, "drop-shadow-[0_8px_20px_rgba(30,215,96,0.18)]", iconClassName)} />
      </div>
    );
  }

  const content = (
    <>
      <PagRecoveryMark
        className={cn(
          markSizeClass,
          "shrink-0 drop-shadow-[0_12px_28px_rgba(30,215,96,0.18)]",
          iconClassName,
        )}
      />
      <div className={cn("min-w-0", textClassName)}>
        <p
          className={cn(
            "font-mono text-[0.58rem] uppercase tracking-[0.34em] text-[rgba(255,255,255,0.54)]",
            size === "lg" && "text-[0.62rem]",
          )}
        >
          Premium Recovery Suite
        </p>
        <p
          className={cn(
            "mt-1 text-lg font-semibold tracking-[-0.06em] text-white [text-shadow:0_6px_18px_rgba(0,0,0,0.32)]",
            size === "lg"
              ? "text-[2.5rem] leading-none"
              : size === "sm"
                ? "text-[1.15rem]"
                : "text-[1.45rem]",
          )}
        >
          {platformBrand.name}
        </p>
      </div>
    </>
  );

  if (mode === "stacked") {
    return (
      <div className={cn("inline-flex flex-col items-start gap-3", frameClass, className)}>
        <PagRecoveryMark className={cn(markSizeClass, iconClassName)} />
        <div className={cn("min-w-0", textClassName)}>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.32em] text-[rgba(255,255,255,0.5)]">
            Premium Recovery Suite
          </p>
          <p className="mt-1 text-[2rem] font-semibold tracking-[-0.06em] text-white">
            {platformBrand.name}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-3.5", frameClass, className)}>
      {content}
    </div>
  );
}
