// The day's rings at the top of Check-in → Today: one ring per energy group, each starting as a
// labelled tab (icon, name, points) that curls around the centre. patchRings() slides them forward live.
import { html, todayKey } from "../util.js";
import { MAX_DAILY } from "../constants.js";
import { state, settings, scoreOf } from "../state.js";
import { normalizeRoutines } from "../routines.js";
import { normalizeWork, todayPicks } from "../work.js";
import { dayRings, habitsDue } from "../rings.js";
import { icon } from "./components.js";

const W = 400, H = 236, CX = 292, CY = 120, STROKE = 18, LEFT = 10;
const RADII = [104, 82, 60, 38];
const pctX = (x) => `${((x / W) * 100).toFixed(2)}%`;
const pctY = (y) => `${((y / H) * 100).toFixed(2)}%`;
const circ = (r) => 2 * Math.PI * r;

export function ringModel(key = state.date) {
  const { items } = normalizeRoutines(state.routines);
  const w = normalizeWork(state.work);
  const picks = key === todayKey() ? todayPicks(w, key) : w.tasks.filter((t) => t.done === key);
  return dayRings({
    cfg: settings(), score: scoreOf(key), day: state.days[key],
    habits: habitsDue(items, key, state.routinelog || {}),
    work: { total: picks.length, done: picks.filter((t) => t.done).length },
  });
}

const signature = (m) => `${state.date}|${m.rings.map((r) => r.id).join(",")}`;

// The frame. Arcs start empty; patchRings() fills them so they sweep in.
export function ringsView(m = ringModel()) {
  const rings = m.rings.map((r, i) => ({ ...r, R: RADII[i] }));
  const labelW = CX - RADII[0] - 8 - (LEFT + 8);
  return html`<div class="rings" data-sig="${signature(m)}" role="img" aria-label="Today's progress by energy group">
    <svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
      ${rings.map((r) => html`<circle class="track" cx="${CX}" cy="${CY}" r="${r.R}" stroke-width="${STROKE}"/>`)}
      ${rings.map((r) => html`<g class="${r.theme}" data-ring="${r.id}">
        <line class="tab" x1="${LEFT}" y1="${CY - r.R}" x2="${CX}" y2="${CY - r.R}" stroke-width="${STROKE}"/>
        <circle class="arc" cx="${CX}" cy="${CY}" r="${r.R}" stroke-width="${STROKE}" transform="rotate(-90 ${CX} ${CY})"
          stroke-dasharray="0 ${circ(r.R).toFixed(1)}" data-c="${circ(r.R).toFixed(1)}"/></g>`)}
    </svg>
    ${rings.map((r) => html`<button class="rlab ${r.theme}" data-act="jumpGroup" data-group="${r.id}"
      style="top:${pctY(CY - r.R)};left:${pctX(LEFT + 8)};width:${pctX(labelW)}" title="${r.why}">
      <span class="rname">${icon(r.icon)}${r.name}</span><b data-ringlabel="${r.id}"></b></button>`)}
    <div class="rcenter" style="left:${pctX(CX)};top:${pctY(CY)}"><span class="rpct num" id="ring-pct"></span><small id="ring-sub"></small></div>
  </div>`;
}

// Updates numbers and arc lengths in place (the CSS transition does the sweep).
export function patchRings(box) {
  if (!box) return;
  const m = ringModel();
  if (box.firstElementChild?.dataset.sig !== signature(m)) box.innerHTML = String(ringsView(m));
  const r = scoreOf(state.date);
  for (const ring of m.rings) {
    const arc = box.querySelector(`[data-ring="${ring.id}"] .arc`);
    const g = arc?.parentElement;
    const lab = box.querySelector(`[data-ringlabel="${ring.id}"]`);
    if (lab) lab.innerHTML = ring.pct >= 1 ? String(html`${ring.label.done}/${ring.label.of} ${icon("circle-check")}`) : `${ring.label.done}/${ring.label.of}`;
    lab?.parentElement.setAttribute("aria-label", `${ring.name}: ${ring.label.done} of ${ring.label.of}${ring.id === "show" ? " done" : " points"}`);
    if (!arc) continue;
    const c = Number(arc.dataset.c), value = `${(ring.pct * c).toFixed(1)} ${c}`;
    g.classList.toggle("full", ring.pct >= 1);
    lab?.parentElement.classList.toggle("full", ring.pct >= 1);
    if (arc.dataset.ready) arc.setAttribute("stroke-dasharray", value);
    else {
      arc.dataset.ready = "1";
      requestAnimationFrame(() => requestAnimationFrame(() => arc.setAttribute("stroke-dasharray", value)));
    }
  }
  const pct = box.querySelector("#ring-pct"), sub = box.querySelector("#ring-sub");
  box.firstElementChild?.classList.toggle("allfull", m.allFull);
  if (pct) pct.innerHTML = m.allFull ? String(icon("party-popper")) : `${Math.round(m.overall * 100)}%`;
  if (sub) sub.textContent = m.allFull ? "Full day!" : r.logged ? `${r.total} / ${MAX_DAILY} pts` : "not started";
}
