"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

export function MagneticButton({
  children,
  className = "",
  style,
  strength = 0.15,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  strength?: number;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 350, damping: 15 });
  const springY = useSpring(y, { stiffness: 350, damping: 15 });

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * strength);
    y.set((e.clientY - cy) * strength);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      className={`inline-block ${className}`}
      style={{ ...style, x: springX, y: springY }}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
    >
      {children}
    </motion.div>
  );
}
