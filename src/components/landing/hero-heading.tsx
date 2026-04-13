"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { platformBrand } from "@/lib/platform";

const b = platformBrand;
const rgb = b.accentRgb;

export function HeroHeading() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const plainWords = ["Recupere", "pagamentos"];
  const gradientWords = ["falhados", "automaticamente"];

  const wordAnim = (i: number) => ({
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.65,
        delay: 0.1 + i * 0.1,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      },
    },
  });

  return (
    <h1
      ref={ref}
      className="mt-6 text-balance text-[2rem] font-extrabold leading-[1.1] tracking-[-0.03em] sm:mt-10 sm:text-[3rem] lg:text-[4.2rem]"
      style={{ color: "#f0f0f0", textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
    >
      {plainWords.map((word, i) => (
        <motion.span
          key={word}
          variants={wordAnim(i)}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="inline-block mr-[0.28em]"
        >
          {word}
        </motion.span>
      ))}

      <span className="relative inline">
        {gradientWords.map((word, i) => (
          <motion.span
            key={word}
            variants={wordAnim(plainWords.length + i)}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="inline-block mr-[0.28em] last:mr-0 shimmer-text bg-clip-text text-transparent"
            style={{
              backgroundImage: `linear-gradient(90deg, ${b.accentStrong}, ${b.accent}, ${b.accentStrong}, ${b.accent})`,
              backgroundSize: "200% auto",
              filter: "brightness(1.15) saturate(1.2)",
            }}
          >
            {word}
          </motion.span>
        ))}
        <motion.span
          className="absolute -bottom-1.5 left-0 h-[2px] w-full"
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{
            duration: 0.9,
            delay: 0.1 + (plainWords.length + gradientWords.length) * 0.1 + 0.15,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{
            background: `linear-gradient(to right, rgba(${rgb},0.6), rgba(${rgb},0.2), transparent)`,
            transformOrigin: "left",
          }}
        />
      </span>
    </h1>
  );
}
