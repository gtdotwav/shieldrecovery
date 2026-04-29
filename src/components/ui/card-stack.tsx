"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

type CardStackItem = {
  id: string;
  content: ReactNode;
};

type CardStackProps = {
  items: CardStackItem[];
  /** Auto-rotate interval in ms. 0 disables auto-rotation. */
  intervalMs?: number;
  className?: string;
};

/**
 * Lightweight 3-card stack with auto-rotation. The top card animates out,
 * the rest slide forward one slot. Built without framer-motion to keep
 * client bundle slim.
 */
export function CardStack({
  items,
  intervalMs = 5_000,
  className = "",
}: CardStackProps) {
  const [order, setOrder] = useState(items.slice(0, 3));

  useEffect(() => {
    setOrder(items.slice(0, 3));
  }, [items]);

  useEffect(() => {
    if (intervalMs <= 0 || items.length <= 1) return;
    const id = setInterval(() => {
      setOrder((current) => {
        if (current.length === 0) return current;
        const [first, ...rest] = current;
        return [...rest, first];
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, items.length]);

  if (order.length === 0) return null;

  return (
    <div className={`relative h-56 w-full ${className}`}>
      {order.map((item, index) => {
        const z = order.length - index;
        const offsetY = index * 12;
        const scale = 1 - index * 0.04;
        const opacity = 1 - index * 0.12;
        return (
          <div
            key={item.id}
            className="absolute inset-x-0 mx-auto max-w-md rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] transition-[transform,opacity] duration-500 dark:border-white/[0.06] dark:bg-[#101010]"
            style={{
              transform: `translateY(${offsetY}px) scale(${scale})`,
              zIndex: z,
              opacity,
            }}
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
}
