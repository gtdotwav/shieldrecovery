import Image from "next/image";

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
    emphasis === "strong" ? "rounded-[1.25rem] bg-transparent" : "";
  const markSizeClass =
    size === "lg"
      ? "h-[4.15rem] w-[4.15rem]"
      : size === "sm"
        ? "h-10 w-10"
        : "h-[3.1rem] w-[3.1rem]";
  const wordmarkSizeClass =
    size === "lg"
      ? "h-[3.4rem] w-[20.75rem]"
      : size === "sm"
        ? "h-[1.6rem] w-[9.75rem]"
        : "h-[2.15rem] w-[13.4rem]";

  if (mode === "icon") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <Image
          src={platformBrand.mark}
          alt={platformBrand.name}
          width={256}
          height={256}
          className={cn(
            markSizeClass,
            "object-contain",
            `drop-shadow-[0_10px_26px_${platformBrand.accentGlow}]`,
            iconClassName,
          )}
          priority
        />
      </div>
    );
  }

  if (mode !== "stacked") {
    return (
      <div className={cn("inline-flex items-center", frameClass, className)}>
        <Image
          src={platformBrand.logo}
          alt={platformBrand.name}
          width={332}
          height={332}
          sizes="332px"
          className={cn(
            wordmarkSizeClass,
            "object-contain brightness-[1.02] [filter:drop-shadow(0_10px_24px_rgba(0,0,0,0.28))]",
            iconClassName,
          )}
          priority
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex flex-col items-start gap-3",
        frameClass,
        className,
      )}
    >
      <Image
        src={platformBrand.mark}
        alt={platformBrand.name}
        width={256}
        height={256}
        className={cn(markSizeClass, "object-contain", iconClassName)}
        priority
      />
      <div className={cn("min-w-0", textClassName)}>
        <p className="text-[2rem] font-bold tracking-[-0.06em] text-gray-900 dark:text-white">
          {platformBrand.name}
        </p>
      </div>
    </div>
  );
}
