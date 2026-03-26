"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const directionVariants: Record<string, Variants> = {
  up: {
    hidden: { opacity: 0, y: 40, filter: "blur(6px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)" },
  },
  left: {
    hidden: { opacity: 0, x: -40, filter: "blur(6px)" },
    visible: { opacity: 1, x: 0, filter: "blur(0px)" },
  },
  right: {
    hidden: { opacity: 0, x: 40, filter: "blur(6px)" },
    visible: { opacity: 1, x: 0, filter: "blur(0px)" },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.92, filter: "blur(6px)" },
    visible: { opacity: 1, scale: 1, filter: "blur(0px)" },
  },
};

export function Reveal({
  children,
  delay = 0,
  className = "",
  direction = "up",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "left" | "right" | "scale";
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={directionVariants[direction]}
      transition={{
        duration: 0.8,
        delay: delay / 1000,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
