/**
 * SVG-based line chart for "Desempenho de Recuperação".
 * Pure server-component compatible – no client JS needed.
 *
 * Renders two lines:
 *   – Vendas Perdidas (gray)
 *   – Vendas Recuperadas (orange)
 */

type DataPoint = { label: string; lost: number; recovered: number };

const CHART_W = 560;
const CHART_H = 200;
const PAD_L = 40;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 28;

function buildPath(
  data: DataPoint[],
  accessor: (d: DataPoint) => number,
  maxY: number,
): string {
  const usableW = CHART_W - PAD_L - PAD_R;
  const usableH = CHART_H - PAD_T - PAD_B;
  const stepX = data.length > 1 ? usableW / (data.length - 1) : 0;

  return data
    .map((d, i) => {
      const x = PAD_L + i * stepX;
      const y = PAD_T + usableH - (accessor(d) / Math.max(maxY, 1)) * usableH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function buildAreaPath(
  data: DataPoint[],
  accessor: (d: DataPoint) => number,
  maxY: number,
): string {
  const line = buildPath(data, accessor, maxY);
  const usableW = CHART_W - PAD_L - PAD_R;
  const stepX = data.length > 1 ? usableW / (data.length - 1) : 0;
  const lastX = PAD_L + (data.length - 1) * stepX;
  const baseY = CHART_H - PAD_B;
  return `${line} L${lastX.toFixed(1)},${baseY} L${PAD_L},${baseY} Z`;
}

export function RecoveryChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) return null;

  const allValues = data.flatMap((d) => [d.lost, d.recovered]);
  const maxY = Math.max(...allValues, 1);

  // Y-axis tick values
  const ticks = [0, Math.round(maxY * 0.33), Math.round(maxY * 0.66), maxY];
  const usableH = CHART_H - PAD_T - PAD_B;

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(249,115,22)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="rgb(249,115,22)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="grayGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9ca3af" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#9ca3af" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {ticks.map((tick, index) => {
          const y = PAD_T + usableH - (tick / Math.max(maxY, 1)) * usableH;
          return (
            <g key={`tick-${index}-${tick}`}>
              <line
                x1={PAD_L}
                y1={y}
                x2={CHART_W - PAD_R}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="0.5"
                strokeDasharray="4 3"
              />
              <text
                x={PAD_L - 6}
                y={y + 3.5}
                textAnchor="end"
                fill="#9ca3af"
                fontSize="9"
                fontFamily="inherit"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => {
          const usableW = CHART_W - PAD_L - PAD_R;
          const stepX = data.length > 1 ? usableW / (data.length - 1) : 0;
          const x = PAD_L + i * stepX;
          return (
            <text
              key={`label-${i}-${d.label}`}
              x={x}
              y={CHART_H - 4}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize="9"
              fontFamily="inherit"
            >
              {d.label}
            </text>
          );
        })}

        {/* Area fills */}
        <path
          d={buildAreaPath(data, (d) => d.lost, maxY)}
          fill="url(#grayGrad)"
        />
        <path
          d={buildAreaPath(data, (d) => d.recovered, maxY)}
          fill="url(#orangeGrad)"
        />

        {/* Lines */}
        <path
          d={buildPath(data, (d) => d.lost, maxY)}
          fill="none"
          stroke="#9ca3af"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={buildPath(data, (d) => d.recovered, maxY)}
          fill="none"
          stroke="rgb(249,115,22)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots on data points */}
        {data.map((d, i) => {
          const usableW = CHART_W - PAD_L - PAD_R;
          const stepX = data.length > 1 ? usableW / (data.length - 1) : 0;
          const x = PAD_L + i * stepX;
          const yLost =
            PAD_T + usableH - (d.lost / Math.max(maxY, 1)) * usableH;
          const yRecovered =
            PAD_T + usableH - (d.recovered / Math.max(maxY, 1)) * usableH;
          return (
            <g key={`dots-${i}-${d.label}`}>
              <circle cx={x} cy={yLost} r="3" fill="#9ca3af" />
              <circle cx={x} cy={yRecovered} r="3" fill="rgb(249,115,22)" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export type { DataPoint };
