"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { ticks, xOf as xOfBase, yOf as yOfBase, spline, closedArea as closedAreaBase } from "@/components/ui/chart-utils";

export type MarketingDataPoint = {
  label: string;
  recovered: number;
  lost: number;
  revenue: number;
};

/* Layout */
const W = 720;
const H = 340;
const PL = 52;
const PR = 20;
const PT = 20;
const PB = 36;
const IW = W - PL - PR;
const IH = H - PT - PB;

/* Bound helpers to local layout constants */
function xOf(i: number, len: number) {
  return xOfBase(i, len, PL, IW);
}

function yOf(val: number, maxY: number) {
  return yOfBase(val, maxY, PT, IH);
}

function closedArea(line: string, pts: { x: number; y: number }[]): string {
  return closedAreaBase(line, pts, PT, IH);
}

type EditingState = {
  index: number;
  recovered: string;
  lost: string;
  revenue: string;
};

export function MarketingChart({
  data,
  onDataChange,
  editable = true,
}: {
  data: MarketingDataPoint[];
  onDataChange?: (data: MarketingDataPoint[]) => void;
  editable?: boolean;
}) {
  const [hIdx, setHIdx] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handlePointer = useCallback(
    (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
      if (!svgRef.current || data.length === 0 || editing) return;
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
    [data, editing],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!editable || !svgRef.current || data.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * W;

      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < data.length; i++) {
        const dist = Math.abs(mx - xOf(i, data.length));
        if (dist < bestD) { bestD = dist; best = i; }
      }
      const step = data.length > 1 ? IW / (data.length - 1) : IW;
      if (bestD < step * 0.65) {
        const d = data[best];
        setEditing({
          index: best,
          recovered: d.recovered.toString(),
          lost: d.lost.toString(),
          revenue: d.revenue.toString(),
        });
      }
    },
    [editable, data],
  );

  const saveEdit = useCallback(() => {
    if (!editing || !onDataChange) return;
    const updated = [...data];
    updated[editing.index] = {
      ...updated[editing.index],
      recovered: Math.max(0, parseInt(editing.recovered) || 0),
      lost: Math.max(0, parseInt(editing.lost) || 0),
      revenue: Math.max(0, parseFloat(editing.revenue) || 0),
    };
    onDataChange(updated);
    setEditing(null);
  }, [editing, data, onDataChange]);

  const cancelEdit = useCallback(() => {
    setEditing(null);
  }, []);

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
        Sem dados. Clique em &quot;Novo Cenário&quot; para começar.
      </div>
    );
  }

  const { maxY, tk, lostPts, recPts, lostLine, recLine, recArea, pathLen } = chart;
  const base = PT + IH;

  return (
    <div className="relative w-full">
      {/* Edit panel overlay */}
      {editing && (
        <div className="absolute top-2 right-2 z-20 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-4 shadow-xl min-w-[260px]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              <Pencil className="inline h-3.5 w-3.5 mr-1.5 text-[var(--accent)]" />
              Editar {data[editing.index].label}
            </h4>
            <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2.5">
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">Recuperadas</span>
              <input
                type="number"
                min="0"
                value={editing.recovered}
                onChange={(e) => setEditing({ ...editing, recovered: e.target.value })}
                className="mt-0.5 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-[var(--accent)] focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">Abertas</span>
              <input
                type="number"
                min="0"
                value={editing.lost}
                onChange={(e) => setEditing({ ...editing, lost: e.target.value })}
                className="mt-0.5 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-[var(--accent)] focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">Receita (R$)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editing.revenue}
                onChange={(e) => setEditing({ ...editing, revenue: e.target.value })}
                className="mt-0.5 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-[var(--accent)] focus:outline-none"
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={saveEdit}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
            >
              <Check className="h-3.5 w-3.5" />
              Salvar
            </button>
            <button
              onClick={cancelEdit}
              className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {editable && !editing && (
        <div className="absolute top-2 right-2 z-10 rounded-lg bg-[var(--accent)]/10 px-2.5 py-1 text-[0.65rem] font-medium text-[var(--accent)]">
          Clique num ponto para editar
        </div>
      )}

      <div className="w-full overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className={`h-auto w-full select-none ${editable && !editing ? "cursor-pointer" : ""}`}
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handlePointer}
          onTouchMove={handlePointer}
          onMouseLeave={() => !editing && setHIdx(null)}
          onTouchEnd={() => !editing && setHIdx(null)}
          onClick={handleClick}
        >
          <defs>
            <linearGradient id="mc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
            <filter id="mc-glow">
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
            const active = hIdx === i || editing?.index === i;
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
            fill="url(#mc-fill)"
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
            filter="url(#mc-glow)"
            strokeDasharray={pathLen}
            strokeDashoffset={ready ? 0 : pathLen}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />

          {/* Data point dots */}
          {ready && data.map((_, i) => {
            const isEditing = editing?.index === i;
            return (
              <g key={`dot${i}`}>
                {/* Recovered dot */}
                <circle
                  cx={recPts[i].x} cy={recPts[i].y}
                  r={isEditing ? 7 : 4}
                  fill={isEditing ? "var(--accent)" : "var(--surface-solid, #fff)"}
                  stroke="var(--accent)"
                  strokeWidth={isEditing ? 0 : 2}
                  className="transition-all duration-200"
                />
                {/* Edit indicator */}
                {editable && !editing && hIdx === i && (
                  <g>
                    <circle cx={recPts[i].x} cy={recPts[i].y} r="12"
                      fill="var(--accent)" opacity="0.15"
                    />
                    <circle cx={recPts[i].x} cy={recPts[i].y} r="18"
                      fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.2"
                      strokeDasharray="3 3"
                    />
                  </g>
                )}
                {/* Lost dot */}
                <circle
                  cx={lostPts[i].x} cy={lostPts[i].y}
                  r={isEditing ? 5 : 2.5}
                  className="fill-[var(--surface-solid, #fff)] stroke-[var(--muted)]"
                  strokeWidth="1.5"
                  opacity={isEditing ? 1 : 0.5}
                />
              </g>
            );
          })}

          {/* Hover tooltip */}
          {hIdx !== null && !editing && (() => {
            const d = data[hIdx];
            const x = xOf(hIdx, data.length);
            const ly = lostPts[hIdx].y;
            const ry = recPts[hIdx].y;
            const total = d.recovered + d.lost;
            const pct = total > 0 ? Math.round((d.recovered / total) * 100) : 0;

            const tw = 170;
            const th = 88;
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
                <line x1={x} y1={PT} x2={x} y2={base}
                  stroke="var(--accent)" strokeWidth="0.7" opacity="0.2"
                  strokeDasharray="3 4"
                />

                <rect x={tx} y={ty} width={tw} height={th} rx="10"
                  className="fill-[var(--surface-solid, #fff)]"
                  stroke="var(--border)" strokeWidth="0.6"
                  filter="url(#mc-glow)"
                />
                <path
                  d={arrow === "down"
                    ? `M${tx + ax - 6},${ty + th} Q${tx + ax},${ty + th + 6} ${tx + ax + 6},${ty + th}`
                    : `M${tx + ax - 6},${ty} Q${tx + ax},${ty - 6} ${tx + ax + 6},${ty}`
                  }
                  className="fill-[var(--surface-solid, #fff)]"
                />

                <text x={tx + 12} y={ty + 17}
                  className="fill-[var(--muted)]"
                  fontSize="9" fontWeight="600"
                  fontFamily="var(--font-ibm-plex-mono), monospace"
                  style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
                >
                  {d.label}
                </text>
                <text x={tx + tw - 12} y={ty + 17}
                  textAnchor="end" fill="var(--accent)"
                  fontSize="9" fontWeight="700"
                  fontFamily="var(--font-ibm-plex-mono), monospace"
                >
                  {pct}%
                </text>

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

                {/* Revenue line */}
                <text x={tx + 12} y={ty + 74}
                  className="fill-[var(--accent)]"
                  fontSize="11" fontWeight="700"
                  fontFamily="var(--font-ibm-plex-mono), monospace"
                >
                  R$ {d.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                </text>

                {/* Progress bar */}
                <rect x={tx + 12} y={ty + 80} width={tw - 24} height={3} rx="1.5"
                  className="fill-[var(--border)]" opacity="0.4"
                />
                {total > 0 && (
                  <rect x={tx + 12} y={ty + 80}
                    width={Math.max((d.recovered / total) * (tw - 24), 2)}
                    height={3} rx="1.5"
                    fill="var(--accent)" opacity="0.6"
                  />
                )}
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}
