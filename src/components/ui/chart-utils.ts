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

/**
 * Monotone cubic Hermite spline (Fritsch-Carlson).
 * Smooth curves that NEVER overshoot between data points —
 * no tangling, no loops, no wild oscillation.
 */
export function spline(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;
  if (n === 2) return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} L${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`;

  // 1. Compute slopes between consecutive points
  const dx: number[] = [];
  const dy: number[] = [];
  const m: number[] = []; // tangent at each point
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    dy[i] = pts[i + 1].y - pts[i].y;
  }

  // 2. Initial tangents via finite differences
  m[0] = dy[0] / (dx[0] || 1);
  for (let i = 1; i < n - 1; i++) {
    const s0 = dy[i - 1] / (dx[i - 1] || 1);
    const s1 = dy[i] / (dx[i] || 1);
    // If slopes change sign → flat tangent (monotonicity)
    if (s0 * s1 <= 0) {
      m[i] = 0;
    } else {
      m[i] = (s0 + s1) / 2;
    }
  }
  m[n - 1] = dy[n - 2] / (dx[n - 2] || 1);

  // 3. Fritsch-Carlson monotonicity adjustment
  for (let i = 0; i < n - 1; i++) {
    const s = dy[i] / (dx[i] || 1);
    if (Math.abs(s) < 1e-10) {
      // Flat segment → flat tangents
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const a = m[i] / s;
      const b = m[i + 1] / s;
      // Clamp to monotone region (circle check)
      const h = Math.hypot(a, b);
      if (h > 3) {
        const t = 3 / h;
        m[i] = t * a * s;
        m[i + 1] = t * b * s;
      }
    }
  }

  // 4. Build cubic Bézier path
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const seg = dx[i] / 3;
    const c1x = pts[i].x + seg;
    const c1y = pts[i].y + m[i] * seg;
    const c2x = pts[i + 1].x - seg;
    const c2y = pts[i + 1].y - m[i + 1] * seg;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${pts[i + 1].x.toFixed(1)},${pts[i + 1].y.toFixed(1)}`;
  }
  return d;
}

export function closedArea(line: string, pts: { x: number; y: number }[], pt: number, ih: number): string {
  if (!pts.length) return "";
  const base = pt + ih;
  return `${line} L${pts[pts.length - 1].x.toFixed(1)},${base} L${pts[0].x.toFixed(1)},${base} Z`;
}
