// Energy flow: this week against your usual, grouped into four themed groups. Tile shade = momentum.
import { read } from "../docs.js";
import { html, todayKey, longDate } from "../util.js";
import { scoredQuestions, questionName } from "../scoring.js";
import { state, settings } from "../state.js";
import { normalizeRoutines, dayStatus } from "../routines.js";
import { GROUPS, groupOf, iconOf, MOMENTUM, windows, trend } from "../energy.js";
import { icon } from "./components.js";
import { isPaused } from "../breathing.js";
import { totals } from "./progress.js";

const round = (n) => Math.round(n * 10) / 10;
const light = (level) => level >= 3; // deep shades take light text

function spark(values) {
  const max = Math.max(1, ...values);
  return html`<span class="spark" aria-hidden="true">${values.map((v) => html`<i style="height:${Math.max(8, Math.round((100 * v) / max))}%"></i>`)}</span>`;
}

function tile(theme, { name, ico, t, values, unit, note, wide }) {
  return html`<div class="etile ${theme} m${t.level}${light(t.level) ? " lt" : ""}${wide ? " wide" : ""}" role="group" aria-label="${name}: ${t.now} ${unit}, ${t.paused ? "paused this week" : MOMENTUM[t.level].toLowerCase()}. Usually ${round(t.avg)}.">
    <div class="hd"><span class="ico">${icon(ico)}</span><span class="mo">${t.paused ? "Paused" : MOMENTUM[t.level]}</span></div>
    <div class="name">${name}</div>
    <div class="foot"><div><div class="num serif">${t.now}<small>${unit}</small></div><div class="was">${note || `usually ${round(t.avg)}`}</div></div>${spark(values)}</div></div>`;
}

const sumSeries = (list) => list[0].map((_, i) => list.reduce((s, v) => s + v[i], 0));

export function energyView() {
  const today = todayKey(), cfg = settings();
  const w = windows(today, Boolean(state.days[today]?.logged));
  const sums = w.windows.map((dates) => totals(dates));
  const qs = scoredQuestions(cfg);
  const { items } = read("routines");

  const groups = GROUPS.map((g) => {
    const tiles = qs.filter((q) => groupOf(q).id === g.id).map((q) => {
      const values = sums.map((s) => s.byQuestion[q.id] || 0);
      // On a breathing-room pause this week: shown as paused, and left out of the group's momentum.
      if (isPaused(cfg, "cat", q.id, today)) return { name: questionName(q), ico: iconOf(q), values, t: { ...trend(values), level: 2, paused: true }, unit: "pts", note: "paused this week", paused: true };
      return { name: questionName(q), ico: iconOf(q), values, t: trend(values), unit: "pts" };
    });
    if (g.id === "show") {
      const values = sums.map((s) => s.checkins);
      tiles.push({ name: "Check-ins", ico: "notebook-pen", values, t: trend(values), unit: `/${w.days} days`, note: `usually ${round(trend(values).avg)} days` });
      if (items.length) {
        const rv = w.windows.map((dates) => dates.filter((d) => dayStatus(items, d, state.routinelog) === "all").length);
        tiles.push({ name: "Habits", ico: "list-checks", values: rv, t: trend(rv), unit: `/${w.days} days`, note: "all done · no points" });
      }
    }
    const counted = tiles.filter((x) => x.name !== "Habits" && !x.paused).map((x) => x.values); // routines are streak-only
    const values = counted.length ? sumSeries(counted) : w.windows.map(() => 0);
    return { ...g, tiles, values, t: trend(values) };
  }).filter((g) => g.tiles.length);

  const total = trend(sumSeries(groups.map((g) => g.values)));
  const diff = total.now - Math.round(total.avg);
  const title = w.lastWeek ? html`Last week <em>vs your usual</em>` : html`This week <em>vs your usual</em>`;
  const sub = w.lastWeek ? "Nothing logged yet this week, so here's last week."
    : w.days === 7 ? "The whole week, against your average for the three weeks before."
    : `${w.days === 1 ? "Today" : `First ${w.days} days`} so far, against the same days in the three weeks before.`;

  return html`<section class="energy">
    <h2 class="etitle serif">${title}</h2><p class="hint">${sub} Deeper colour = more momentum.</p>
    <div class="eover">
      <div class="row"><div><div class="big serif">${total.now}</div><div class="hint">energy points</div></div>
        <span class="delta ${diff > 0 ? "up" : diff < 0 ? "down" : "flat"}">${diff > 0 ? `▲ ${diff}` : diff < 0 ? `▼ ${-diff}` : "="} vs usual</span></div>
      <div class="eq4">${groups.map((g) => html`<a href="#eg-${g.id}" class="${g.theme} m${g.t.level}${light(g.t.level) ? " lt" : ""}" aria-label="${g.name}: ${g.t.now}, ${MOMENTUM[g.t.level].toLowerCase()}">
        <b>${g.name}</b><span class="serif">${g.t.now}</span><small>${MOMENTUM[g.t.level]}</small></a>`)}</div>
      <div class="escale"><span>Slipping</span><span class="sw garden"><i></i><i></i><i></i><i></i><i></i></span><span>Surging</span></div>
    </div>
    ${groups.map((g) => html`<div class="egroup ${g.theme}" id="eg-${g.id}">
      <div class="ghead"><div class="gtitle"><span class="gicon">${icon(g.icon)}</span><div><div class="tname">${g.themeName}</div><h3 class="serif">${g.name}</h3></div></div>
        <div class="gsum"><b>${g.t.now}</b> <span class="small">${MOMENTUM[g.t.level]}</span></div></div>
      <p class="gwhy">${g.why}</p>
      <div class="etiles">${g.tiles.map((x, i) => tile(g.theme, { ...x, wide: g.tiles.length % 2 === 1 && i === g.tiles.length - 1 }))}</div></div>`)}
    <p class="hint">Momentum compares with your average for the three weeks before: more than 20% up is surging, 5–20% rising, within 5% steady, 5–20% down dipping, more than 20% down slipping. Bars show the last six weeks. Updated ${longDate(today)}.</p>
  </section>`;
}
