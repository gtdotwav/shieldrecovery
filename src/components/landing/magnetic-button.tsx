"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useCallback, useRef, type CSSProperties, type ReactNode } from "react";

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
  const rectRef = useRef<DOMRect | null>(null);
  const rafId = useRef(0);

  const handleEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    rectRef.current = e.currentTarget.getBoundingClientRect();
  }, []);

  const handleMouse = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = rectRef.current;
    if (!rect) return;
    cancelAnimationFrame(rafId.current);
    const clientX = e.clientX;
    const clientY = e.clientY;
    rafId.current = requestAnimationFrame(() => {
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      x.set((clientX - cx) * strength);
      y.set((clientY - cy) * strength);
    });
  }, [x, y, strength]);

  const handleLeave = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    rectRef.current = null;
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      className={`inline-block ${className}`}
      style={{ ...style, x: springX, y: springY }}
      onMouseEnter={handleEnter}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
    >
      {children}
    </motion.div>
  );
}
