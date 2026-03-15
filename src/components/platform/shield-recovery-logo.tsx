import Image from "next/image";

import { cn } from "@/lib/utils";

type ShieldRecoveryLogoProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  mode?: "stacked" | "inline" | "icon";
};

const LOGO_SRC = "/brand/shield-recovery-logo.png";
const LOGO_WIDTH = 669;
const LOGO_HEIGHT = 373;

export function ShieldRecoveryLogo({
  className,
  iconClassName,
  textClassName,
  mode = "inline",
}: ShieldRecoveryLogoProps) {
  if (mode === "icon") {
    return <LogoMark className={cn("h-11 w-11", iconClassName, className)} />;
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
          sizes="(max-width: 640px) 70vw, 24rem"
          className={cn(
            "h-auto w-[min(24rem,72vw)] drop-shadow-[0_0_26px_rgba(255,106,0,0.12)]",
            textClassName,
          )}
        />
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center", className)}>
      <Image
        src={LOGO_SRC}
        alt="Shield Recovery"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        priority
        sizes="(max-width: 640px) 12rem, 14rem"
        className={cn(
          "h-11 w-auto drop-shadow-[0_0_20px_rgba(255,106,0,0.1)] sm:h-12",
          textClassName,
        )}
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
