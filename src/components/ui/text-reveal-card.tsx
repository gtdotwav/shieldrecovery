"use client";

import React, { memo, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { twMerge } from "tailwind-merge";

import { cn } from "@/lib/utils";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type StarConfig = {
  startTop: number;
  startLeft: number;
  animateTop: number;
  animateLeft: number;
  driftX: number;
  driftY: number;
  opacity: number;
  duration: number;
};

// Use deterministic values so SSR and client hydration always match.
const seededUnit = (seed: number) => {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
};

const createStarConfig = (count: number): StarConfig[] =>
  Array.from({ length: count }, (_, index) => {
    const base = index + 1;

    return {
      startTop: seededUnit(base * 1.13) * 100,
      startLeft: seededUnit(base * 2.17) * 100,
      animateTop: seededUnit(base * 3.19) * 100,
      animateLeft: seededUnit(base * 4.23) * 100,
      driftX: seededUnit(base * 5.29) * 4 - 2,
      driftY: seededUnit(base * 6.31) * 4 - 2,
      opacity: 0.15 + seededUnit(base * 7.37) * 0.85,
      duration: 20 + seededUnit(base * 8.41) * 10,
    };
  });

const STAR_CONFIG = createStarConfig(80);

export const TextRevealCard = ({
  text,
  revealText,
  children,
  className,
  showStars = true,
}: {
  text: string;
  revealText: string;
  children?: React.ReactNode;
  className?: string;
  showStars?: boolean;
}) => {
  const [widthPercentage, setWidthPercentage] = useState(0);
  const [metrics, setMetrics] = useState({ left: 0, width: 0 });
  const [isPointerInside, setIsPointerInside] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;

    if (!card) {
      return;
    }

    // Keep the reveal aligned even after responsive layout changes.
    const measure = () => {
      const { left, width } = card.getBoundingClientRect();
      setMetrics({ left, width });
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(card);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, []);

  const updateRevealWidth = (clientX: number) => {
    if (!metrics.width) {
      return;
    }

    const relativeX = clientX - metrics.left;
    const nextWidth = clamp((relativeX / metrics.width) * 100, 0, 100);
    setWidthPercentage(nextWidth);
  };

  const resetReveal = () => {
    setIsPointerInside(false);
    setWidthPercentage(0);
  };

  const rotateDeg = (widthPercentage - 50) * 0.08;

  return (
    <div
      ref={cardRef}
      onPointerEnter={() => setIsPointerInside(true)}
      onPointerLeave={resetReveal}
      onPointerMove={(event) => updateRevealWidth(event.clientX)}
      className={cn(
        "relative w-full overflow-hidden rounded-[1.75rem] border border-gray-200 dark:border-gray-800 bg-[rgba(7,22,17,0.78)] p-6 touch-none sm:p-7 backdrop-blur-[22px]",
        className,
      )}
    >
      {children}

      <div className="relative flex h-24 items-center overflow-hidden sm:h-[7.5rem] lg:h-32">
        <motion.div
          style={{ width: "100%" }}
          animate={
            isPointerInside
              ? {
                  opacity: widthPercentage > 0 ? 1 : 0,
                  clipPath: `inset(0 ${100 - widthPercentage}% 0 0)`,
                }
              : {
                  clipPath: `inset(0 ${100 - widthPercentage}% 0 0)`,
                }
          }
          transition={isPointerInside ? { duration: 0 } : { duration: 0.4 }}
          className="absolute z-20 bg-[rgba(7,22,17,0.94)] will-change-transform"
        >
          <p
            style={{ textShadow: "4px 4px 15px rgba(0,0,0,0.5)" }}
            className="bg-gradient-to-b from-white to-[#d1d5db] bg-clip-text py-2 text-[clamp(1.55rem,4.5vw,2.45rem)] font-bold leading-[0.94] tracking-[-0.06em] text-transparent sm:py-4"
          >
            {revealText}
          </p>
        </motion.div>
        <motion.div
          animate={{
            left: `${widthPercentage}%`,
            rotate: `${rotateDeg}deg`,
            opacity: widthPercentage > 0 ? 1 : 0,
          }}
          transition={isPointerInside ? { duration: 0 } : { duration: 0.4 }}
          className="absolute z-50 h-24 w-[8px] bg-gradient-to-b from-transparent via-[var(--accent)] to-transparent will-change-transform sm:h-[7.5rem] lg:h-32"
        />

        <div className="overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,white,transparent)]">
          <p className="bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.05))] bg-clip-text py-2 text-[clamp(1.55rem,4.5vw,2.45rem)] font-bold leading-[0.94] tracking-[-0.06em] text-transparent sm:py-4">
            {text}
          </p>
          {showStars ? <MemoizedStars /> : null}
        </div>
      </div>
    </div>
  );
};

export const TextRevealCardTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <h2 className={twMerge("mb-2 text-lg text-gray-900 dark:text-white", className)}>{children}</h2>;
};

export const TextRevealCardDescription = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <p className={twMerge("text-sm text-gray-500 dark:text-gray-400", className)}>{children}</p>;
};

const Stars = () => {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {STAR_CONFIG.map((star, index) => (
        <motion.span
          key={`star-${index}`}
          animate={{
            top: `calc(${star.animateTop}% + ${star.driftY}px)`,
            left: `calc(${star.animateLeft}% + ${star.driftX}px)`,
            opacity: star.opacity,
            scale: [1, 1.2, 0],
          }}
          transition={{
            duration: star.duration,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          style={{
            position: "absolute",
            top: `${star.startTop}%`,
            left: `${star.startLeft}%`,
            width: "2px",
            height: "2px",
            backgroundColor: "white",
            borderRadius: "50%",
            zIndex: 1,
          }}
          className="inline-block"
        />
      ))}
    </div>
  );
};

export const MemoizedStars = memo(Stars);
