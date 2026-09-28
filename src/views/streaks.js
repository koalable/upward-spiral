// Streaks: a calendar per area (check-ins, each question category, each routine group), with badges.
import { html, todayKey, dateRange, monthKey, monthDays, monthName, addDays, parseKey, longDate } from "../util.js";
import { POINTS_PER_CATEGORY } from "../constants.js";
import { scoredQuestions, questionName, scoreDay } from "../scoring.js";
import { state, settings, showedUp, checkedIn, joinedBy } from "../state.js";
import { normalizeRoutines, inRitual, dayStatus } from "../routines.js";
import { runs, BADGES, nextBadge } from "../streaks.js";
import { pressed } from "./components.js";
import { themeOf } from "../energy.js";

const LABEL = { all: "all done", some: "some done", none: "not done" };

// Every area this person has, each with a way to judge a day.
export function areas() {
  const uid = state.uid, cfg = settings();
  const started = (d) => joinedBy(uid, d);
  const list = [{
    id: "checkins", name: "Check-ins", theme: "dusk",
    about: "Filled: a floor day (you showed up). Ring: checked in but under the floor.",
    status: (d) => (!started(d) ? null : showedUp(uid, d) ? "all" : checkedIn(uid, d) ? "some" : "none"),
  }];
  for (const q of scoredQuestions(cfg)) {
    list.push({
      id: `q-${q.id}`, name: questionName(q), theme: themeOf(q),
      about: `Filled: full ${POINTS_PER_CATEGORY} points. Ring: some points.`,
      status: (d) => {
        if (!started(d)) return null;
        const r = scoreDay(state.days[d], cfg);
        if (!r.logged) return "none";
        if (!(q.id in r.points)) return null; // not one of this day's questions
        const p = r.points[q.id];
        return p >= POINTS_PER_CATEGORY ? "all" : p > 0 ? "some" : "none";
      },
    });
  }
  const { items, rituals } = normalizeRoutines(state.routines), log = state.routinelog;
  if (items.length) {
    list.push({ id: "r-all", name: "All habits", theme: "dusk", about: "Filled: every habit due that day. Ring: some.", status: (d) => dayStatus(items, d, log) });
    for (const { id: g, name } of rituals) {
      const mine = inRitual(items, g);
      if (mine.length) list.push({ id: `r-${g}`, name: `${name} ritual`, theme: "dusk", about: "Filled: every habit due that day. Ring: some.", status: (d) => dayStatus(mine, d, log) });
    }
  }
  return list;
}

const history = () => dateRange(state.historyStart, todayKey());

function calendar(area, result) {
  const today = todayKey(), mk = state.calMonth || monthKey(today);
  const first = monthKey(state.historyStart);
  const days = monthDays(mk), lead = (parseKey(days[0]).getDay() + 6) % 7; // Monday first
  const cells = days.map((d) => {
    const info = result.byDay[d]; // only loaded history has data
    const status = info?.status;
    const pending = d === today && status !== "all"; // today isn't over yet
    const cls = d > today || pending ? "future" : status || "rest";
    const label = `${longDate(d)}: ${d > today ? "ahead" : status ? LABEL[status] : "nothing due"}${info?.star ? ", badge day" : ""}`;
    return html`<span class="cday ${cls}${d === today ? " today" : ""}" role="gridcell" aria-label="${label}" title="${label}">
      ${info?.star ? html`<i class="cstar" aria-hidden="true">★</i>` : ""}${Number(d.slice(8))}</span>`;
  });
  return html`<div class="calnav">
      <button class="iconbtn" data-act="calMonth" data-by="-1" aria-label="Previous month" ${mk <= first ? "disabled" : ""}>‹</button>
      <h3>${monthName(mk)} ${mk.slice(0, 4)}</h3>
      <button class="iconbtn" data-act="calMonth" data-by="1" aria-label="Next month" ${mk >= monthKey(today) ? "disabled" : ""}>›</button></div>
    <div class="cal ${area.theme}" role="grid" aria-label="${area.name}, ${monthName(mk)}">
      ${["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((w) => html`<span class="cwd" aria-hidden="true">${w}</span>`)}
      ${Array.from({ length: lead }, () => html`<span class="cpad"></span>`)}${cells}</div>
    <div class="calkey small"><span><i class="k all"></i>All done</span><span><i class="k some"></i>Some done</span><span><i class="k none"></i>Missed</span><span><i class="cstar">★</i>Badge earned</span></div>
    <p class="hint">${area.about} Days with nothing due don't break a streak.</p>`;
}

function shelf(best) {
  const next = nextBadge(best);
  return html`<div class="shelf" role="list">${BADGES.map(([n, name]) => {
    const got = best >= n;
    return html`<div class="bdg${got ? " got" : ""}" role="listitem" aria-label="${name}, ${n}-day streak, ${got ? "earned" : "locked"}">
      <span class="bico" aria-hidden="true">${got ? "★" : "🔒"}</span><b>${name}</b><span class="small muted">${n}-day streak</span></div>`;
  })}</div>
  ${next ? html`<p class="hint">${next[0] - best} more ${next[0] - best === 1 ? "day" : "days"} in a row for <b>${next[1]}</b>.</p>` : html`<p class="hint">Every badge earned. Legendary.</p>`}`;
}

export function streaksView() {
  const list = areas(), dates = history();
  const area = list.find((a) => a.id === state.area) || list[0];
  const results = Object.fromEntries(list.map((a) => [a.id, runs(dates, a.status)]));
  const result = results[area.id], mk = monthKey(todayKey());
  const fullThisMonth = (a) => monthDays(mk).filter((d) => results[a.id].byDay[d]?.status === "all").length;
  return html`
    <section class="panel ${area.theme}"><h2>${area.name}</h2>
      <div class="hero slim"><div><div class="big num streaknum">${result.current}<small> day${result.current === 1 ? "" : "s"}</small></div><div class="cap">Current streak</div></div>
        <div><div class="big num">${result.best}<small> day${result.best === 1 ? "" : "s"}</small></div><div class="cap">Best, last 120 days</div></div></div>
      <div class="chips areas" role="group" aria-label="Choose an area">${list.map((a) => html`<button class="chip ${a.theme}" data-act="area" data-area="${a.id}" aria-pressed="${pressed(a.id === area.id)}">${a.name}</button>`)}</div>
      ${calendar(area, result)}</section>
    <section class="panel ${area.theme}"><h2>Badges: ${area.name}</h2>${shelf(result.best)}</section>
    <section class="panel"><h2>All areas</h2><div class="scroll"><table>
      <thead><tr><th>Area</th><th class="n">Streak</th><th class="n">Best</th><th class="n">This month</th></tr></thead>
      <tbody>${list.map((a) => html`<tr class="${a.id === area.id ? "me" : ""}"><td><button class="linkbtn" data-act="area" data-area="${a.id}">${a.name}</button></td>
        <td class="n num">${results[a.id].current}</td><td class="n num">${results[a.id].best}</td><td class="n num">${fullThisMonth(a)}</td></tr>`)}</tbody></table></div></section>`;
}

export const shiftMonth = (by) => {
  const mk = state.calMonth || monthKey(todayKey());
  state.calMonth = monthKey(addDays(`${mk}-15`, by * 30));
};
