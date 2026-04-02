"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type DataPoint = { label: string; lost: number; recovered: number };

/* ═══ Layout ═══ */
const W = 720;
const H = 300;
const PL = 44;
const PR = 20;
const PT = 20;
const PB = 36;
const IW = W - PL - PR;
const IH = H - PT - PB;

/* ═══ Helpers ═══ */

function niceMax(v: number): number {
  if (v <= 0) return 5;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const r = v / mag;
  if (r <= 1) return mag;
  if (r <= 2) return 2 * mag;
  if (r <= 5) return 5 * mag;
  return 10 * mag;
}

function ticks(max: number, count: number): number[] {
  const nice = niceMax(max);
  const step = nice / count;
  return Array.from({ length: count + 1 }, (_, i) => Math.round(i * step));
}

function xOf(i: number, len: number) {
  return PL + (len > 1 ? (i / (len - 1)) * IW : IW / 2);
}

function yOf(val: number, maxY: number) {
  return PT + IH - (val / Math.max(maxY, 1)) * IH;
}

/* ═══ Catmull-Rom spline ═══ */
function spline(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return pts.length ? `M${pts[0].x},${pts[0].y}` : "";
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;

  const alpha = 0.5;
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

function closedArea(line: string, pts: { x: number; y: number }[]): string {
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
  const [ready, setReady] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
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

    const all = data.flatMap((d) => [d.lost, d.recovered]);
    const raw = Math.max(...all, 1);
    const tk = ticks(raw, 4);
    const maxY = tk[tk.length - 1];

    const lostPts = data.map((d, i) => ({ x: xOf(i, data.length), y: yOf(d.lost, maxY) }));
    const recPts = data.map((d, i) => ({ x: xOf(i, data.length), y: yOf(d.recovered, maxY) }));

    const lostLine = spline(lostPts);
    const recLine = spline(recPts);
    const recArea = closedArea(recLine, recPts);

    let pathLen = 0;
    for (let i = 1; i < recPts.length; i++) {
      pathLen += Math.hypot(recPts[i].x - recPts[i - 1].x, recPts[i].y - recPts[i - 1].y);
    }
    pathLen *= 1.4;

    return { maxY, tk, lostPts, recPts, lostLine, recLine, recArea, pathLen };
  }, [data]);

  if (!chart) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl text-sm text-[var(--muted)]">
        Sem dados suficientes para exibir o grafico.
      </div>
    );
  }

  const { maxY, tk, lostPts, recPts, lostLine, recLine, recArea, pathLen } = chart;
  const base = PT + IH;

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
          <linearGradient id="rc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
          <filter id="rc-glow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid */}
        {tk.map((t, i) => {
          const y = yOf(t, maxY);
          return (
            <g key={`g${i}`}>
              <line
                x1={PL} y1={y} x2={W - PR} y2={y}
                className="stroke-[var(--border)]"
                strokeWidth="0.5"
                opacity={i === 0 ? 0.5 : 0.25}
                strokeDasharray={i === 0 ? undefined : "4 6"}
              />
              <text
                x={PL - 8} y={y + 3.5}
                textAnchor="end"
                className="fill-[var(--muted)]"
                fontSize="10"
                fontFamily="var(--font-ibm-plex-mono), monospace"
                opacity="0.6"
              >
                {t}
              </text>
            </g>
          );
        })}

        {/* X labels */}
        {data.map((d, i) => {
          const x = xOf(i, data.length);
          const active = hIdx === i;
          return (
            <text
              key={`x${i}`}
              x={x} y={H - 10}
              textAnchor="middle"
              className={active ? "fill-[var(--foreground)]" : "fill-[var(--muted)]"}
              fontSize="10.5"
              fontWeight={active ? "600" : "400"}
              fontFamily="var(--font-ibm-plex-mono), monospace"
              opacity={active ? 1 : 0.55}
            >
              {d.label}
            </text>
          );
        })}

        {/* Area fill */}
        <path
          d={recArea}
          fill="url(#rc-fill)"
          opacity={ready ? 1 : 0}
          className="transition-opacity duration-700"
        />

        {/* Lost line */}
        <path
          d={lostLine}
          fill="none"
          className="stroke-[var(--muted)]"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.3"
          strokeDasharray={pathLen}
          strokeDashoffset={ready ? 0 : pathLen}
          style={{ transition: "stroke-dashoffset 1s ease-out 0.1s" }}
        />

        {/* Recovered line */}
        <path
          d={recLine}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#rc-glow)"
          strokeDasharray={pathLen}
          strokeDashoffset={ready ? 0 : pathLen}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />

        {/* Static dots on data points */}
        {ready && data.map((_, i) => {
          if (hIdx !== null) return null;
          const last = i === data.length - 1;
          return (
            <circle
              key={`dot${i}`}
              cx={recPts[i].x} cy={recPts[i].y}
              r={last ? 4 : 2.5}
              fill={last ? "var(--accent)" : "var(--surface-solid, #fff)"}
              stroke="var(--accent)"
              strokeWidth={last ? 0 : 1.5}
              opacity={last ? 1 : 0.5}
            />
          );
        })}

        {/* Last-point pulse */}
        {hIdx === null && data.length > 0 && ready && (() => {
          const last = recPts[recPts.length - 1];
          return (
            <circle cx={last.x} cy={last.y} r="4"
              fill="none" stroke="var(--accent)" strokeWidth="1.5" opacity="0.35"
            >
              <animate attributeName="r" from="6" to="18" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.35" to="0" dur="2.5s" repeatCount="indefinite" />
            </circle>
          );
        })()}

        {/* Hover layer */}
        {hIdx !== null && (() => {
          const d = data[hIdx];
          const x = xOf(hIdx, data.length);
          const ly = lostPts[hIdx].y;
          const ry = recPts[hIdx].y;
          const total = d.recovered + d.lost;
          const pct = total > 0 ? Math.round((d.recovered / total) * 100) : 0;

          const prev = hIdx > 0 ? data[hIdx - 1] : null;
          const delta = prev ? d.recovered - prev.recovered : null;

          // Tooltip positioning
          const tw = 152;
          const th = 72;
          const gap = 12;
          const topY = Math.min(ly, ry);
          let ty = topY - th - gap;
          let arrow: "down" | "up" = "down";
          if (ty < 4) { ty = Math.max(ly, ry) + gap; arrow = "up"; }
          let tx = x - tw / 2;
          if (tx < 4) tx = 4;
          if (tx + tw > W - 4) tx = W - tw - 4;
          const ax = x - tx;

          return (
            <g>
              {/* Vertical guide */}
              <line
                x1={x} y1={PT} x2={x} y2={base}
                stroke="var(--accent)" strokeWidth="0.7" opacity="0.2"
                strokeDasharray="3 4"
              />

              {/* Dots */}
              <circle cx={x} cy={ly} r="3.5"
                className="fill-[var(--surface-solid, #fff)] stroke-[var(--muted)]"
                strokeWidth="1.5" opacity="0.7"
              />
              <circle cx={x} cy={ry} r="5"
                className="fill-[var(--surface-solid, #fff)]"
                stroke="var(--accent)" strokeWidth="2.5"
              />

              {/* Tooltip */}
              <g>
                <rect x={tx} y={ty} width={tw} height={th} rx="10"
                  className="fill-[var(--surface-solid, #fff)]"
                  stroke="var(--border)" strokeWidth="0.6"
                  filter="url(#rc-glow)"
                />
                {/* Arrow */}
                <path
                  d={arrow === "down"
                    ? `M${tx + ax - 6},${ty + th} Q${tx + ax},${ty + th + 6} ${tx + ax + 6},${ty + th}`
                    : `M${tx + ax - 6},${ty} Q${tx + ax},${ty - 6} ${tx + ax + 6},${ty}`
                  }
                  className="fill-[var(--surface-solid, #fff)]"
                />

                {/* Month + % */}
                <text x={tx + 12} y={ty + 17}
                  className="fill-[var(--muted)]"
                  fontSize="9" fontWeight="600"
                  fontFamily="var(--font-ibm-plex-mono), monospace"
                  style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
                >
                  {d.label}
                </text>
                <text x={tx + tw - 12} y={ty + 17}
                  textAnchor="end"
                  fill="var(--accent)"
                  fontSize="9" fontWeight="700"
                  fontFamily="var(--font-ibm-plex-mono), monospace"
                >
                  {pct}%
                </text>

                {/* Recovered */}
                <circle cx={tx + 16} cy={ty + 33} r="3" fill="var(--accent)" />
                <text x={tx + 24} y={ty + 36}
                  className="fill-[var(--foreground)]"
                  fontSize="12" fontWeight="600"
                >
                  {d.recovered}
                </text>
                <text x={tx + 24 + String(d.recovered).length * 7.5 + 3} y={ty + 36}
                  className="fill-[var(--muted)]" fontSize="10"
                >
                  rec.
                </text>
                {delta !== null && delta !== 0 && (
                  <text x={tx + tw - 12} y={ty + 36}
                    textAnchor="end"
                    fill={delta > 0 ? "var(--accent)" : "var(--danger, #ef4444)"}
                    fontSize="9" fontWeight="600"
                    fontFamily="var(--font-ibm-plex-mono), monospace"
                  >
                    {delta > 0 ? "+" : ""}{delta}
                  </text>
                )}

                {/* Open */}
                <circle cx={tx + 16} cy={ty + 52} r="3"
                  className="fill-[var(--muted)]" opacity="0.4"
                />
                <text x={tx + 24} y={ty + 55}
                  className="fill-[var(--foreground)]"
                  fontSize="12" fontWeight="600"
                >
                  {d.lost}
                </text>
                <text x={tx + 24 + String(d.lost).length * 7.5 + 3} y={ty + 55}
                  className="fill-[var(--muted)]" fontSize="10"
                >
                  aberta{d.lost !== 1 ? "s" : ""}
                </text>

                {/* Progress bar */}
                <rect x={tx + 12} y={ty + 63} width={tw - 24} height={3} rx="1.5"
                  className="fill-[var(--border)]" opacity="0.4"
                />
                {total > 0 && (
                  <rect x={tx + 12} y={ty + 63}
                    width={Math.max((d.recovered / total) * (tw - 24), 2)}
                    height={3} rx="1.5"
                    fill="var(--accent)" opacity="0.6"
                  />
                )}
              </g>
            </g>
          );
        })()}
      </svg>
    </div>
  );
});

export type { DataPoint };
