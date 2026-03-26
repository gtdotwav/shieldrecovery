"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";

export function TiltCard({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const isTouch = useRef(false);

  const handlePointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") {
      isTouch.current = true;
      return;
    }
    isTouch.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isTouch.current) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({
      rotateX: (y - 0.5) * -6,
      rotateY: (x - 0.5) * 6,
    });
    setGlare({ x: x * 100, y: y * 100, opacity: 1 });
  };

  const handlePointerLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
    setGlare({ x: 50, y: 50, opacity: 0 });
  };

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={{
        ...style,
        transform: `perspective(800px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
        transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        transformStyle: "preserve-3d",
        willChange: glare.opacity > 0 ? "transform" : "auto",
      }}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {children}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.05), transparent 60%)`,
          opacity: glare.opacity,
          transition: "opacity 0.3s ease",
        }}
      />
    </div>
  );
}
