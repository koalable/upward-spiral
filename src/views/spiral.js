// The spiral: one dot per day, winding outward as the challenge goes on.
// Bigger, darker dots = more points; gold ring = weekly-goal bonus; star = level up.
import { html, todayKey, addDays, dateRange, longDate } from "../util.js";
import { MAX_DAILY } from "../constants.js";
import { state, sharedScore, checkedIn } from "../state.js";

const SPACING = 11;   // distance between days along the curve
const RING_GAP = 15;  // distance between turns
const MAX_DAYS = 365;

function star(x, y, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? r * 0.45 : r;
    pts.push(`${(x + rad * Math.cos(a)).toFixed(1)},${(y + rad * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

export function spiralDays(uid) {
  const today = todayKey();
  const joined = state.members[uid]?.joined || today;
  const start = [joined, state.historyStart, addDays(today, -(MAX_DAYS - 1))].sort().pop();
  return dateRange(start, today).map((date) => {
    const s = sharedScore(uid, date);
    return { date, logged: checkedIn(uid, date), total: Number(s?.total || 0), bonus: Number(s?.bonus || 0), levelUp: Boolean(s?.levelUp) };
  });
}

export function spiral(days, { size = 320, label = "Progress spiral" } = {}) {
  const b = RING_GAP / (2 * Math.PI);
  const theta0 = 2 * Math.PI * 0.6; // start a little out from the center
  const s0 = (b * theta0 * theta0) / 2;
  const points = days.map((day, i) => {
    const theta = Math.sqrt((2 * (s0 + i * SPACING)) / b); // equal spacing along an Archimedean spiral
    const r = b * theta;
    return { ...day, x: r * Math.cos(theta - Math.PI / 2), y: r * Math.sin(theta - Math.PI / 2) };
  });
  // A fixed minimum canvas means the spiral visibly grows over the weeks instead of starting zoomed in.
  // A fixed minimum canvas means the spiral visibly grows over the weeks instead of starting zoomed in.
  const extent = Math.max(80, ...points.map((p) => Math.hypot(p.x, p.y))) + 14;
  const path = points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const today = todayKey();
  const logged = days.filter((d) => d.logged).length;

  const dots = points.map((p) => {
    const frac = Math.min(1, p.total / MAX_DAILY);
    const title = `${longDate(p.date)}: ${p.logged ? `${p.total} pts${p.bonus ? ` + ${p.bonus} bonus` : ""}` : "not logged"}`;
    const dot = p.logged
      ? html`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(2.2 + 4.2 * frac).toFixed(1)}" fill="var(--accent)" fill-opacity="${(0.3 + 0.7 * frac).toFixed(2)}"/>`
      : html`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="1.6" fill="none" stroke="var(--line)"/>`;
    const ring = p.bonus && !p.levelUp ? html`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="8" fill="none" stroke="var(--streak)" stroke-width="1.6"/>` : "";
    const lvl = p.levelUp ? html`<polygon points="${star(p.x, p.y, 9)}" fill="var(--streak)" stroke="var(--surface)" stroke-width=".8"/>` : "";
    const now = p.date === today ? html`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="10" fill="none" stroke="var(--ink)" stroke-width="1.2" stroke-dasharray="2 2"/>` : "";
    return html`<g><title>${title}</title>${ring}${dot}${lvl}${now}</g>`;
  });

  return html`<svg class="spiral" viewBox="${-extent} ${-extent} ${2 * extent} ${2 * extent}" width="${size}" height="${size}" role="img" aria-label="${label}: ${logged} of ${days.length} days logged">
    <path d="${path}" fill="none" stroke="var(--line)" stroke-width="1"/>${dots}</svg>`;
}

export const spiralLegend = () => html`<p class="hint small spiral-legend">One dot per day, spiraling outward. Bigger and darker means more points.
  <span class="leg ring"></span> weekly-goal bonus · <span class="leg star">★</span> level up · dashed ring is today.</p>`;
