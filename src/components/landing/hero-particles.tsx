"use client";

import { useCallback, useEffect, useRef } from "react";
import { platformBrand } from "@/lib/platform";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  baseOpacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export function HeroParticles({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef(0);
  const timeRef = useRef(0);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const isMobile = rect.width < 768;
    const count = isMobile
      ? Math.min(30, Math.floor((rect.width * rect.height) / 20000))
      : Math.min(70, Math.floor((rect.width * rect.height) / 10000));

    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      size: Math.random() * 1.5 + 0.5,
      opacity: 0,
      baseOpacity: Math.random() * 0.35 + 0.1,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinkleOffset: Math.random() * Math.PI * 2,
    }));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const [r, g, bv] = platformBrand.accentRgb.split(",").map(Number);
    const isMobile = window.innerWidth < 768;
    const connectionDist = isMobile ? 0 : 130;

    init();

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };

    window.addEventListener("mousemove", handleMouse);
    window.addEventListener("mouseleave", handleLeave);
    window.addEventListener("resize", init);

    const dpr = Math.min(window.devicePixelRatio, 2);

    function animate() {
      timeRef.current++;
      const rect = canvas!.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx!.save();
      ctx!.scale(dpr, dpr);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const t = timeRef.current;

      for (const p of particles) {
        // Mouse repulsion
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160 && dist > 0) {
          const force = ((160 - dist) / 160) * 0.015;
          p.vx -= (dx / dist) * force;
          p.vy -= (dy / dist) * force;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Friction
        p.vx *= 0.995;
        p.vy *= 0.995;

        // Wrap around edges
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        // Twinkle
        p.opacity =
          p.baseOpacity *
          (0.7 + 0.3 * Math.sin(t * p.twinkleSpeed + p.twinkleOffset));

        // Draw particle
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${r},${g},${bv},${p.opacity})`;
        ctx!.fill();
      }

      // Draw connections (desktop only)
      if (connectionDist > 0) {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const d = dx * dx + dy * dy;
            const maxD = connectionDist * connectionDist;
            if (d < maxD) {
              const alpha = (1 - d / maxD) * 0.1;
              ctx!.beginPath();
              ctx!.moveTo(particles[i].x, particles[i].y);
              ctx!.lineTo(particles[j].x, particles[j].y);
              ctx!.strokeStyle = `rgba(${r},${g},${bv},${alpha})`;
              ctx!.lineWidth = 0.5;
              ctx!.stroke();
            }
          }
        }
      }

      ctx!.restore();
      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("mouseleave", handleLeave);
      window.removeEventListener("resize", init);
    };
  }, [init]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${className}`}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
