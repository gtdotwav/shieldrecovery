"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { platformBrand } from "@/lib/platform";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 50,
    restDelta: 0.001,
  });

  const b = platformBrand;

  return (
    <motion.div
      className="fixed left-0 right-0 top-0 z-[60] h-[2px] origin-left"
      style={{
        scaleX,
        background: `linear-gradient(90deg, ${b.accent}, ${b.accentStrong})`,
        boxShadow: `0 0 8px ${b.accentGlow}`,
      }}
    />
  );
}
