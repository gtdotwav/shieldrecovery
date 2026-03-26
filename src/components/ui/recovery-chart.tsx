"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type DataPoint = { label: string; lost: number; recovered: number };

/* ═══ Layout ═══ */
const W = 740;
const H = 340;
const PL = 50;
const PR = 24;
const PT = 24;
const PB = 48;
const IW = W - PL - PR;
const IH = H - PT - PB;
const BAR_W = 14;
const BAR_GAP = 3;

/* ═══ Axis helpers ═══ */
function niceMax(v: number): number {
  if (v <= 0) return 5;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const r = v / mag;
  if (r <= 1) return mag;
  if (r <= 2) return 2 * mag;
  if (r <= 5) return 5 * mag;
  return 10 * mag;
}

function ticks(max: number, n: number): number[] {
  const nice = niceMax(max);
  const step = nice / n;
  return Array.from({ length: n + 1 }, (_, i) => Math.round(i * step));
}

function xOf(i: number, len: number) {
  return PL + (len > 1 ? (i / (len - 1)) * IW : IW / 2);
}

function yOf(val: number, maxY: number) {
  return PT + IH - (val / Math.max(maxY, 1)) * IH;
}

/* ═══ Catmull-Rom spline ═══ */
function spline(pts: { x: number; y: number }[], alpha = 0.5): string {
  if (pts.length < 2) return pts.length ? `M${pts[0].x},${pts[0].y}` : "";
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;

  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];

    const d0 = Math.hypot(p1.x - p0.x, p1.y - p0.y) ** alpha;
    const d1 = Math.hypot(p2.x - p1.x, p2.y - p1.y) ** alpha;
    const d2 = Math.hypot(p3.x - p2.x, p3.y - p2.y) ** alpha;

    const c1x = (d1 * d1 * p0.x - d0 * d0 * p2.x + (2 * d0 * d0 + 3 * d0 * d1 + d1 * d1) * p1.x) / (3 * d0 * (d0 + d1));
    const c1y = (d1 * d1 * p0.y - d0 * d0 * p2.y + (2 * d0 * d0 + 3 * d0 * d1 + d1 * d1) * p1.y) / (3 * d0 * (d0 + d1));
    const c2x = (d1 * d1 * p3.x - d2 * d2 * p1.x + (2 * d2 * d2 + 3 * d2 * d1 + d1 * d1) * p2.x) / (3 * d2 * (d2 + d1));
    const c2y = (d1 * d1 * p3.y - d2 * d2 * p1.y + (2 * d2 * d2 + 3 * d2 * d1 + d1 * d1) * p2.y) / (3 * d2 * (d2 + d1));

    const x1 = Number.isFinite(c1x) ? c1x : p1.x;
    const y1 = Number.isFinite(c1y) ? c1y : p1.y;
    const x2 = Number.isFinite(c2x) ? c2x : p2.x;
    const y2 = Number.isFinite(c2y) ? c2y : p2.y;

    d += ` C${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function area(line: string, pts: { x: number; y: number }[]): string {
  if (!pts.length) return "";
  const base = PT + IH;
  return `${line} L${pts[pts.length - 1].x.toFixed(1)},${base} L${pts[0].x.toFixed(1)},${base} Z`;
}

/* ═══ Component ═══ */
export const RecoveryChart = React.memo(function RecoveryChart({
  data,
}: {
  data: DataPoint[];
}) {
  const [hIdx, setHIdx] = useState<number | null>(null);
  const [drawn, setDrawn] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Animate line draw-in on mount
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handlePointer = useCallback(
    (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
      if (!svgRef.current || data.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const mx = ((clientX - rect.left) / rect.width) * W;

      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < data.length; i++) {
        const dist = Math.abs(mx - xOf(i, data.length));
        if (dist < bestD) { bestD = dist; best = i; }
      }
      const step = data.length > 1 ? IW / (data.length - 1) : IW;
      setHIdx(bestD < step * 0.65 ? best : null);
    },
    [data],
  );

  const chart = useMemo(() => {
    if (data.length === 0) return null;

    const all = data.flatMap((d) => [d.lost, d.recovered, d.lost + d.recovered]);
    const raw = Math.max(...all, 1);
    const tk = ticks(raw, 4);
    const maxY = tk[tk.length - 1];

    const lPts = data.map((d, i) => ({ x: xOf(i, data.length), y: yOf(d.lost, maxY) }));
    const rPts = data.map((d, i) => ({ x: xOf(i, data.length), y: yOf(d.recovered, maxY) }));

    const lLine = spline(lPts);
    const rLine = spline(rPts);
    const lArea = area(lLine, lPts);
    const rArea = area(rLine, rPts);

    // Compute line length for draw-in animation
    let lineLen = 0;
    for (let i = 1; i < rPts.length; i++) {
      lineLen += Math.hypot(rPts[i].x - rPts[i - 1].x, rPts[i].y - rPts[i - 1].y);
    }
    // Generous overestimate for curves
    lineLen *= 1.4;

    return { maxY, tk, lPts, rPts, lLine, rLine, lArea, rArea, lineLen };
  }, [data]);

  if (!chart) {
    return (
      <div className="glass-inset flex h-64 items-center justify-center rounded-xl text-sm text-[var(--muted)]">
        Sem dados suficientes para exibir o grafico.
      </div>
    );
  }

  const { maxY, tk, lPts, rPts, lLine, rLine, lArea, rArea, lineLen } = chart;
  const base = PT + IH;
  const colW = data.length > 1 ? IW / (data.length - 1) : 60;

  return (
    <div className="w-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full select-none"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handlePointer}
        onTouchMove={handlePointer}
        onMouseLeave={() => setHIdx(null)}
        onTouchEnd={() => setHIdx(null)}
      >
        <defs>
          {/* Area gradients */}
          <linearGradient id="rc-ag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rc-lg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--muted)" stopOpacity="0.09" />
            <stop offset="100%" stopColor="var(--muted)" stopOpacity="0" />
          </linearGradient>

          {/* Line glow */}
          <filter id="rc-gl">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Line shadow */}
          <filter id="rc-sh" x="-10%" y="-10%" width="120%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="var(--accent)" floodOpacity="0.25" />
          </filter>

          {/* Crosshair gradient */}
          <linearGradient id="rc-xh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
            <stop offset="20%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="80%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>

          {/* Column hover */}
          <linearGradient id="rc-hc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>

          {/* Bar gradient */}
          <linearGradient id="rc-bar-a" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.65" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="rc-bar-m" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--muted)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--muted)" stopOpacity="0.28" />
          </linearGradient>
        </defs>

        {/* ═══ Grid ═══ */}
        {tk.map((t, i) => {
          const y = yOf(t, maxY);
          return (
            <g key={`t${i}`}>
              <line
                x1={PL} y1={y} x2={W - PR} y2={y}
                className="stroke-[var(--border)]"
                strokeWidth={i === 0 ? "0.8" : "0.5"}
                strokeDasharray={i === 0 ? undefined : "3 5"}
                opacity={i === 0 ? 0.5 : 0.3}
              />
              <text
                x={PL - 10} y={y + 3.5}
                textAnchor="end"
                className="fill-[var(--muted)]"
                fontSize="10"
                fontFamily="var(--font-ibm-plex-mono), monospace"
                opacity="0.7"
              >
                {t}
              </text>
            </g>
          );
        })}

        {/* ═══ X labels ═══ */}
        {data.map((d, i) => {
          const x = xOf(i, data.length);
          const isH = hIdx === i;
          return (
            <g key={`x${i}`}>
              {/* Tick mark */}
              <line
                x1={x} y1={base} x2={x} y2={base + 5}
                className="stroke-[var(--border)]"
                strokeWidth="0.8"
                opacity="0.4"
              />
              <text
                x={x} y={H - 8}
                textAnchor="middle"
                className={isH ? "fill-[var(--foreground)]" : "fill-[var(--muted)]"}
                fontSize="10.5"
                fontWeight={isH ? "600" : "400"}
                fontFamily="var(--font-ibm-plex-mono), monospace"
                opacity={isH ? 1 : 0.65}
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {/* ═══ Hover column ═══ */}
        {hIdx !== null && (
          <rect
            x={xOf(hIdx, data.length) - colW / 2}
            y={PT} width={colW} height={IH}
            fill="url(#rc-hc)" rx="4"
          />
        )}

        {/* ═══ Micro-bars ═══ */}
        {data.map((d, i) => {
          const x = xOf(i, data.length);
          const isH = hIdx === i;
          const recH = (d.recovered / Math.max(maxY, 1)) * IH;
          const lostH = (d.lost / Math.max(maxY, 1)) * IH;
          const opacity = isH ? 1 : hIdx !== null ? 0.3 : 0.55;

          return (
            <g key={`b${i}`} opacity={opacity} className="transition-opacity duration-150">
              {/* Lost bar */}
              {d.lost > 0 && (
                <rect
                  x={x - BAR_W / 2 - BAR_GAP / 2 - BAR_W / 2}
                  y={base - lostH}
                  width={BAR_W}
                  height={Math.max(lostH, 1)}
                  rx="3"
                  fill="url(#rc-bar-m)"
                />
              )}
              {/* Recovered bar */}
              {d.recovered > 0 && (
                <rect
                  x={x + BAR_GAP / 2 - BAR_W / 2 + BAR_W / 2}
                  y={base - recH}
                  width={BAR_W}
                  height={Math.max(recH, 1)}
                  rx="3"
                  fill="url(#rc-bar-a)"
                />
              )}
            </g>
          );
        })}

        {/* ═══ Area fills ═══ */}
        <path
          d={lArea} fill="url(#rc-lg)"
          opacity={drawn ? 1 : 0}
          className="transition-opacity duration-700"
        />
        <path
          d={rArea} fill="url(#rc-ag)"
          opacity={drawn ? 1 : 0}
          className="transition-opacity duration-700"
        />

        {/* ═══ Lines ═══ */}
        {/* Lost line */}
        <path
          d={lLine} fill="none"
          className="stroke-[var(--muted)]"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.4"
          strokeDasharray={lineLen}
          strokeDashoffset={drawn ? 0 : lineLen}
          style={{ transition: "stroke-dashoffset 1.2s ease-out 0.1s" }}
        />
        {/* Accent line shadow */}
        <path
          d={rLine} fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#rc-sh)"
          opacity={drawn ? 0.5 : 0}
          style={{ transition: "opacity 0.8s ease-out 0.6s" }}
        />
        {/* Accent line */}
        <path
          d={rLine} fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={lineLen}
          strokeDashoffset={drawn ? 0 : lineLen}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />

        {/* ═══ Hover interaction layer ═══ */}
        {hIdx !== null && (() => {
          const d = data[hIdx];
          const x = xOf(hIdx, data.length);
          const ly = lPts[hIdx].y;
          const ry = rPts[hIdx].y;

          // Delta vs previous
          const prev = hIdx > 0 ? data[hIdx - 1] : null;
          const recDelta = prev ? d.recovered - prev.recovered : null;
          const total = d.recovered + d.lost;
          const recPct = total > 0 ? Math.round((d.recovered / total) * 100) : 0;

          // Tooltip layout
          const tw = 174;
          const th = 88;
          const gap = 14;
          const top = Math.min(ly, ry);
          let ty = top - th - gap;
          let arrow: "down" | "up" = "down";
          if (ty < 2) { ty = Math.max(ly, ry) + gap; arrow = "up"; }
          let tx = x - tw / 2;
          if (tx < 2) tx = 2;
          if (tx + tw > W - 2) tx = W - tw - 2;
          const ax = x - tx;

          return (
            <g>
              {/* Crosshair */}
              <line
                x1={x} y1={PT + 4} x2={x} y2={base - 4}
                stroke="url(#rc-xh)" strokeWidth="1"
              />

              {/* Lost dot */}
              <circle cx={x} cy={ly} r="4"
                className="fill-[var(--surface-solid)] stroke-[var(--muted)]"
                strokeWidth="2" opacity="0.8"
              />
              {/* Recovered dot */}
              <circle cx={x} cy={ry} r="5.5"
                className="fill-[var(--surface-solid)]"
                stroke="var(--accent)" strokeWidth="2.5"
              />
              <circle cx={x} cy={ry} r="10"
                fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.2"
              />

              {/* ── Tooltip ── */}
              <g>
                {/* Shadow layers */}
                <rect x={tx + 2} y={ty + 3} width={tw} height={th} rx="12"
                  fill="black" opacity="0.22" />
                <rect x={tx + 1} y={ty + 1} width={tw} height={th} rx="12"
                  fill="black" opacity="0.08" />

                {/* Background */}
                <rect x={tx} y={ty} width={tw} height={th} rx="12"
                  className="fill-[var(--surface-solid)]"
                  stroke="var(--border)" strokeWidth="0.7"
                />

                {/* Arrow */}
                <path
                  d={arrow === "down"
                    ? `M${tx + ax - 7},${ty + th - 0.5} Q${tx + ax},${ty + th + 7} ${tx + ax + 7},${ty + th - 0.5}`
                    : `M${tx + ax - 7},${ty + 0.5} Q${tx + ax},${ty - 7} ${tx + ax + 7},${ty + 0.5}`
                  }
                  className="fill-[var(--surface-solid)]"
                />

                {/* Header row: month + percentage badge */}
                <text x={tx + 14} y={ty + 18}
                  className="fill-[var(--muted)]"
                  fontSize="9.5" fontWeight="600"
                  fontFamily="var(--font-ibm-plex-mono), monospace"
                  style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
                >
                  {d.label}
                </text>
                {/* Recovery % badge */}
                <rect x={tx + tw - 50} y={ty + 8} width={38} height={16} rx="4"
                  fill="var(--accent)" opacity="0.12"
                />
                <text x={tx + tw - 31} y={ty + 19.5}
                  textAnchor="middle"
                  fill="var(--accent)"
                  fontSize="9" fontWeight="700"
                  fontFamily="var(--font-ibm-plex-mono), monospace"
                >
                  {recPct}%
                </text>

                {/* Divider */}
                <line x1={tx + 14} y1={ty + 28} x2={tx + tw - 14} y2={ty + 28}
                  className="stroke-[var(--border)]" strokeWidth="0.5" />

                {/* Recovered row */}
                <rect x={tx + 14} y={ty + 36} width={6} height={6} rx="1.5"
                  fill="var(--accent)" />
                <text x={tx + 26} y={ty + 43}
                  className="fill-[var(--foreground)]"
                  fontSize="12" fontWeight="600"
                >
                  {d.recovered}
                </text>
                <text x={tx + 26 + String(d.recovered).length * 7.5 + 4} y={ty + 43}
                  className="fill-[var(--muted)]"
                  fontSize="10.5"
                >
                  recuperado{d.recovered !== 1 ? "s" : ""}
                </text>
                {/* Delta badge */}
                {recDelta !== null && recDelta !== 0 && (
                  <text
                    x={tx + tw - 14} y={ty + 43}
                    textAnchor="end"
                    fill={recDelta > 0 ? "var(--accent)" : "var(--danger, #ef4444)"}
                    fontSize="9" fontWeight="600"
                    fontFamily="var(--font-ibm-plex-mono), monospace"
                  >
                    {recDelta > 0 ? "+" : ""}{recDelta}
                  </text>
                )}

                {/* Lost row */}
                <rect x={tx + 14} y={ty + 55} width={6} height={6} rx="1.5"
                  className="fill-[var(--muted)]" opacity="0.5" />
                <text x={tx + 26} y={ty + 62}
                  className="fill-[var(--foreground)]"
                  fontSize="12" fontWeight="600"
                >
                  {d.lost}
                </text>
                <text x={tx + 26 + String(d.lost).length * 7.5 + 4} y={ty + 62}
                  className="fill-[var(--muted)]"
                  fontSize="10.5"
                >
                  aberto{d.lost !== 1 ? "s" : ""}
                </text>

                {/* Mini comparison bar */}
                <rect x={tx + 14} y={ty + 72} width={tw - 28} height={4} rx="2"
                  className="fill-[var(--border)]" opacity="0.5"
                />
                {total > 0 && (
                  <rect x={tx + 14} y={ty + 72}
                    width={Math.max((d.recovered / total) * (tw - 28), 2)}
                    height={4} rx="2"
                    fill="var(--accent)" opacity="0.7"
                  />
                )}
              </g>
            </g>
          );
        })()}

        {/* ═══ Last-point pulse (when not hovering) ═══ */}
        {hIdx === null && data.length > 0 && drawn && (() => {
          const last = rPts[rPts.length - 1];
          return (
            <g>
              <circle cx={last.x} cy={last.y} r="4" fill="var(--accent)" />
              <circle cx={last.x} cy={last.y} r="4"
                fill="none" stroke="var(--accent)" strokeWidth="1.5" opacity="0.4">
                <animate attributeName="r" from="6" to="16" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.4" to="0" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle cx={last.x} cy={last.y} r="4"
                fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.2">
                <animate attributeName="r" from="8" to="20" dur="2.5s" begin="0.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.2" to="0" dur="2.5s" begin="0.5s" repeatCount="indefinite" />
              </circle>
            </g>
          );
        })()}
      </svg>
    </div>
  );
});

export type { DataPoint };
