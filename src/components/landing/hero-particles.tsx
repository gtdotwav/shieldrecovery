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
      ? Math.min(14, Math.floor((rect.width * rect.height) / 30000))
      : Math.min(30, Math.floor((rect.width * rect.height) / 18000));

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
    const connectionDist = isMobile ? 0 : 120;
    const connectionDistSq = connectionDist * connectionDist;

    init();

    // Throttled mouse handler — update at most every 32ms (~30fps)
    let lastMouseTime = 0;
    const handleMouse = (e: MouseEvent) => {
      const now = e.timeStamp;
      if (now - lastMouseTime < 32) return;
      lastMouseTime = now;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };

    window.addEventListener("mousemove", handleMouse, { passive: true });
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
        const distSq = dx * dx + dy * dy;
        if (distSq < 25600 && distSq > 0) { // 160^2
          const dist = Math.sqrt(distSq);
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

      // Draw connections (desktop only, every 3rd frame for perf)
      if (connectionDist > 0 && t % 3 === 0) {
        ctx!.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            // Early exit: skip if single axis already exceeds distance
            if (dx > connectionDist || dx < -connectionDist) continue;
            const dy = particles[i].y - particles[j].y;
            if (dy > connectionDist || dy < -connectionDist) continue;
            const d = dx * dx + dy * dy;
            if (d < connectionDistSq) {
              const alpha = (1 - d / connectionDistSq) * 0.1;
              ctx!.beginPath();
              ctx!.moveTo(particles[i].x, particles[i].y);
              ctx!.lineTo(particles[j].x, particles[j].y);
              ctx!.strokeStyle = `rgba(${r},${g},${bv},${alpha})`;
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
