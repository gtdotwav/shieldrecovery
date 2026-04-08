/* Shared chart utility functions used by recovery-chart and marketing-chart */

export function niceMax(v: number): number {
  if (v <= 0) return 5;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const r = v / mag;
  if (r <= 1) return mag;
  if (r <= 2) return 2 * mag;
  if (r <= 5) return 5 * mag;
  return 10 * mag;
}

export function ticks(max: number, count: number): number[] {
  const nice = niceMax(max);
  const step = nice / count;
  return Array.from({ length: count + 1 }, (_, i) => Math.round(i * step));
}

export function xOf(i: number, len: number, pl: number, iw: number) {
  return pl + (len > 1 ? (i / (len - 1)) * iw : iw / 2);
}

export function yOf(val: number, maxY: number, pt: number, ih: number) {
  return pt + ih - (val / Math.max(maxY, 1)) * ih;
}

/* Catmull-Rom spline */
export function spline(pts: { x: number; y: number }[]): string {
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

export function closedArea(line: string, pts: { x: number; y: number }[], pt: number, ih: number): string {
  if (!pts.length) return "";
  const base = pt + ih;
  return `${line} L${pts[pts.length - 1].x.toFixed(1)},${base} L${pts[0].x.toFixed(1)},${base} Z`;
}
