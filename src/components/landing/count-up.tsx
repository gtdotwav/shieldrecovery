"use client";

import { useEffect, useRef, useState } from "react";
import {
  useInView,
  useMotionValue,
  useSpring,
} from "framer-motion";

export function CountUp({
  end,
  duration = 2200,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(decimals > 0 ? "0.0" : "0");

  // Map duration to spring stiffness for natural feel
  const stiffness = Math.max(40, Math.round(120000 / duration));

  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    stiffness,
    damping: 28,
    restDelta: 0.01,
  });

  useEffect(() => {
    if (isInView) motionValue.set(end);
  }, [isInView, end, motionValue]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (v) => {
      if (decimals > 0) {
        setDisplay(v.toFixed(decimals));
      } else {
        setDisplay(Math.round(v).toLocaleString("pt-BR"));
      }
    });
    return unsubscribe;
  }, [spring, decimals]);

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
