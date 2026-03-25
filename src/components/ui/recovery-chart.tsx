"use client";

import { useCallback, useRef, useState } from "react";

type DataPoint = { label: string; lost: number; recovered: number };

const CHART_W = 560;
const CHART_H = 220;
const PAD_L = 40;
const PAD_R = 16;
const PAD_T = 24;
const PAD_B = 32;

function getCoords(
  data: DataPoint[],
  accessor: (d: DataPoint) => number,
  maxY: number,
) {
  const usableW = CHART_W - PAD_L - PAD_R;
  const usableH = CHART_H - PAD_T - PAD_B;
  const stepX = data.length > 1 ? usableW / (data.length - 1) : 0;

  return data.map((d, i) => ({
    x: PAD_L + i * stepX,
    y: PAD_T + usableH - (accessor(d) / Math.max(maxY, 1)) * usableH,
  }));
}

function buildSmoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return "";
  if (coords.length === 1) return `M${coords[0].x},${coords[0].y}`;

  let path = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;

  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const tension = 0.3;
    const dx = curr.x - prev.x;
    const cp1x = prev.x + dx * tension;
    const cp2x = curr.x - dx * tension;
    path += ` C${cp1x.toFixed(1)},${prev.y.toFixed(1)} ${cp2x.toFixed(1)},${curr.y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
  }

  return path;
}

function buildSmoothAreaPath(coords: { x: number; y: number }[]): string {
  const line = buildSmoothPath(coords);
  if (!coords.length) return "";
  const lastX = coords[coords.length - 1].x;
  const baseY = CHART_H - PAD_B;
  return `${line} L${lastX.toFixed(1)},${baseY} L${coords[0].x.toFixed(1)},${baseY} Z`;
}

export function RecoveryChart({ data }: { data: DataPoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || data.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * CHART_W;

      const usableW = CHART_W - PAD_L - PAD_R;
      const stepX = data.length > 1 ? usableW / (data.length - 1) : 0;

      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < data.length; i++) {
        const x = PAD_L + i * stepX;
        const dist = Math.abs(mouseX - x);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }

      setHoveredIndex(closestDist < stepX * 0.6 ? closest : null);
    },
    [data],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  if (data.length === 0) {
    return (
      <div className="glass-inset flex h-48 items-center justify-center rounded-xl text-sm text-[rgba(255,255,255,0.54)]">
        Sem dados suficientes para exibir o grafico.
      </div>
    );
  }

  const allValues = data.flatMap((d) => [d.lost, d.recovered]);
  const maxY = Math.max(...allValues, 1);

  const ticks = [0, Math.round(maxY * 0.5), maxY];
  const usableH = CHART_H - PAD_T - PAD_B;
  const usableW = CHART_W - PAD_L - PAD_R;
  const stepX = data.length > 1 ? usableW / (data.length - 1) : 0;

  const lostCoords = getCoords(data, (d) => d.lost, maxY);
  const recoveredCoords = getCoords(data, (d) => d.recovered, maxY);

  return (
    <div className="w-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="recoveredGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1ED760" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#1ED760" stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.26)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.26)" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {ticks.map((tick, index) => {
          const y = PAD_T + usableH - (tick / Math.max(maxY, 1)) * usableH;
          return (
            <g key={`tick-${index}`}>
              <line
                x1={PAD_L}
                y1={y}
                x2={CHART_W - PAD_R}
                y2={y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="0.5"
              />
              <text
                x={PAD_L - 8}
                y={y + 3.5}
                textAnchor="end"
                fill="rgba(255,255,255,0.44)"
                fontSize="10"
                fontFamily="inherit"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => {
          const x = PAD_L + i * stepX;
          return (
            <text
              key={`label-${i}`}
              x={x}
              y={CHART_H - 6}
              textAnchor="middle"
              fill={hoveredIndex === i ? "#ffffff" : "rgba(255,255,255,0.44)"}
              fontSize="10"
              fontWeight={hoveredIndex === i ? "600" : "400"}
              fontFamily="inherit"
            >
              {d.label}
            </text>
          );
        })}

        {/* Area fills */}
        <path d={buildSmoothAreaPath(lostCoords)} fill="url(#portfolioGrad)" />
        <path d={buildSmoothAreaPath(recoveredCoords)} fill="url(#recoveredGrad)" />

        {/* Lines */}
        <path
          d={buildSmoothPath(lostCoords)}
          fill="none"
          stroke="rgba(255,255,255,0.44)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={buildSmoothPath(recoveredCoords)}
          fill="none"
          stroke="#1ED760"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data point dots */}
        {data.map((d, i) => {
          const isHovered = hoveredIndex === i;
          const lostY = lostCoords[i].y;
          const recoveredY = recoveredCoords[i].y;
          const x = lostCoords[i].x;

          return (
            <g key={`dots-${i}`}>
              {/* Hover vertical guide */}
              {isHovered ? (
                <line
                  x1={x}
                  y1={PAD_T}
                  x2={x}
                  y2={CHART_H - PAD_B}
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              ) : null}

              {/* Lost dot */}
              <circle
                cx={x}
                cy={lostY}
                r={isHovered ? 5 : 3}
                fill={isHovered ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.44)"}
                stroke={isHovered ? "white" : "none"}
                strokeWidth={isHovered ? 2 : 0}
              />

              {/* Recovered dot */}
              <circle
                cx={x}
                cy={recoveredY}
                r={isHovered ? 5 : 3}
                fill="#1ED760"
                stroke={isHovered ? "white" : "none"}
                strokeWidth={isHovered ? 2 : 0}
              />

              {/* Tooltip */}
              {isHovered ? (
                <g>
                  <rect
                    x={x - 62}
                    y={Math.min(lostY, recoveredY) - 54}
                    width={124}
                    height={44}
                    rx={8}
                    fill="rgba(5,18,14,0.96)"
                    opacity={0.95}
                  />
                  {/* Arrow */}
                  <path
                    d={`M${x - 5},${Math.min(lostY, recoveredY) - 10} L${x},${Math.min(lostY, recoveredY) - 5} L${x + 5},${Math.min(lostY, recoveredY) - 10}`}
                    fill="rgba(5,18,14,0.96)"
                    opacity={0.95}
                  />
                  <text
                    x={x}
                    y={Math.min(lostY, recoveredY) - 37}
                    textAnchor="middle"
                    fill="#f97316"
                    fontSize="11"
                    fontWeight="600"
                    fontFamily="inherit"
                  >
                    {d.recovered} recuperado{d.recovered !== 1 ? "s" : ""}
                  </text>
                  <text
                    x={x}
                    y={Math.min(lostY, recoveredY) - 22}
                    textAnchor="middle"
                    fill="#d1d5db"
                    fontSize="11"
                    fontFamily="inherit"
                  >
                    {d.lost} aberto{d.lost !== 1 ? "s" : ""}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export type { DataPoint };
