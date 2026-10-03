// Meds: a week on one screen. One row per day, time of day across; each item has its own colour.
// Filled dot = logged dose. Hollow ring = a reminder time for that item (so a ring with no dot nearby = not logged).
import { html, todayKey, addDays, weekStart, weekday, shortDate, dateRange, clock, atTime } from "../util.js";
import { MEDLOG_DAYS } from "../constants.js";
import { state } from "../state.js";
import { medList, logsOn, doseLabel } from "../meds.js";
import { icon } from "./components.js";

// Distinct, readable on dark and cream backgrounds.
const PALETTE = ["#3b82f6", "#f97316", "#22c55e", "#e11d48", "#a855f7", "#eab308", "#14b8a6", "#ec4899", "#84cc16", "#64748b", "#f43f5e", "#06b6d4"];

const minutesOf = (ms) => { const d = new Date(ms); return d.getHours() * 60 + d.getMinutes(); };
const pct = (min) => `${((min / 1440) * 100).toFixed(2)}%`;

export function medWeek() {
  const today = todayKey(), meds = medList();
  const offset = Math.min(0, state.medWeek || 0);
  const start = addDays(weekStart(today), 7 * offset), days = dateRange(start, addDays(start, 6));
  const oldest = addDays(today, -MEDLOG_DAYS);
  const colorOf = new Map(meds.map((m, i) => [m.id, PALETTE[i % PALETTE.length]]));
  // Three lanes per row, so doses taken at nearly the same time don't hide each other.
  const laneOf = new Map(meds.map((m, i) => [m.id, ((i % 3) - 1) * 7]));
  const lane = (id) => `top:calc(50% + ${laneOf.get(id) ?? 0}px)`;
  const other = "#94a3b8";
  const seen = new Map(); // id/name -> { name, color, n }

  const rows = days.map((key) => {
    const future = key > today;
    const logs = future ? [] : logsOn(key);
    const dots = logs.map((x) => {
      const color = colorOf.get(x.medId) || other, id = x.medId || `o:${x.name}`;
      const s = seen.get(id) || { name: x.name, color, n: 0 };
      s.n++; seen.set(id, s);
      const label = `${x.name}${x.dose ? " " + doseLabel(x.dose, x.unit) : ""} · ${clock(x.at)}`;
      return html`<i class="mwdot" style="left:${pct(minutesOf(x.at))};${lane(x.medId)};background:${color}" title="${label}" aria-label="${label}"></i>`;
    });
    const rings = future ? [] : meds.filter((m) => m.active !== false).flatMap((m) => (m.times || []).filter(Boolean).map((t) => {
      const min = Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
      if (key === today && min > minutesOf(Date.now())) return "";
      return html`<i class="mwring" style="left:${pct(min)};${lane(m.id)};border-color:${colorOf.get(m.id)}" title="${m.name} reminder · ${clock(atTime(key, t))}"></i>`;
    }));
    return html`<div class="mwrow${key === today ? " today" : ""}${future ? " future" : ""}">
      <span class="mwday"><b>${weekday(key)}</b><small>${Number(key.slice(8))}</small></span>
      <span class="mwtrack">${rings}${dots}</span></div>`;
  });

  const legend = [...seen.values()].sort((a, b) => b.n - a.n);
  return html`<div class="medweek" role="figure" aria-label="Doses for the week of ${shortDate(start)}">
    <div class="mwnav"><button class="iconbtn" data-act="medWeek" data-by="-1" aria-label="Previous week" ${start <= oldest ? "disabled" : ""}>‹</button>
      <b class="max">${offset === 0 ? "This week" : `${shortDate(start)} – ${shortDate(addDays(start, 6))}`}</b>
      <button class="iconbtn" data-act="medWeek" data-by="1" aria-label="Next week" ${offset >= 0 ? "disabled" : ""}>›</button></div>
    <div class="mwaxis" aria-hidden="true"><span></span><span class="mwticks">${["12a", "6a", "12p", "6p", "12a"].map((t, i) => html`<em style="left:${i * 25}%">${t}</em>`)}</span></div>
    ${rows}
    <div class="mwlegend">${legend.length ? legend.map((s) => html`<span><i style="background:${s.color}"></i>${s.name} <small>×${s.n}</small></span>`) : html`<span class="muted">Nothing logged this week.</span>`}
      <span class="muted"><i class="ring"></i>reminder time</span></div>
  </div>`;
}
