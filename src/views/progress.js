// My progress: streaks, the last two weeks, and week/month comparisons (my own data only).
import { html, todayKey, addDays, dateRange, weekOf, weekStart, monthKey, monthDays, monthName, weekday, toNum } from "../util.js";
import { MAX_DAILY } from "../constants.js";
import { scoredQuestions, questionName, scoreDay, writingMinutes } from "../scoring.js";
import { state, settings, currentStreak, longestStreak, myFreezes, dayTotal, showedUp, seasonDays, leadName, hasBuiltin, sumPoints } from "../state.js";
import { change, progressBar } from "./components.js";
import { spiral, spiralDays, spiralLegend } from "./spiral.js";
import { energyView } from "./energy.js";

export function totals(dates) {
  const today = todayKey(), out = { total: 0, checkins: 0, byQuestion: {} };
  for (const d of dates) {
    if (d > today) continue;
    const r = scoreDay(state.days[d], settings());
    if (!r.logged) continue;
    out.total += r.total;
    out.checkins++;
    for (const [id, p] of Object.entries(r.points)) out.byQuestion[id] = (out.byQuestion[id] || 0) + p;
  }
  return out;
}

function doubleMisses() {
  const days = seasonDays(), today = todayKey();
  return days.filter((d) => d < today && addDays(d, -1) >= days[0] && !showedUp(state.uid, d) && !showedUp(state.uid, addDays(d, -1))).length;
}

export function progressView() {
  const today = todayKey(), uid = state.uid;
  const mk = monthKey(today), pmk = monthKey(addDays(`${mk}-01`, -1));
  const thisMonth = totals(monthDays(mk)), lastMonth = totals(monthDays(pmk));
  const streak = currentStreak(uid), last14 = dateRange(addDays(today, -13), today);
  const misses = seasonDays().length ? doubleMisses() : null;

  const t = settings().targets;
  let writeMin = 0, readMin = 0;
  for (const d of weekOf(today)) {
    const a = state.days[d]?.a;
    if (a && d <= today) { writeMin += writingMinutes(a); readMin += toNum(a.reading); }
  }
  const row = (label, now, before, bold) => html`<tr${bold ? html` class="totalrow"` : ""}><td>${label}</td><td class="n">${now}</td><td class="n">${before}</td><td class="n">${change(now, before)}</td></tr>`;

  return html`
    ${energyView()}
    <section class="hero">
      <div><div class="big num streaknum">${streak.days}${streak.capped ? "+" : ""}<small> days</small></div><div class="cap">Current ${leadName().toLowerCase()} streak</div></div>
      <div><div class="big num">${longestStreak(uid)}<small> days</small></div><div class="cap">Longest streak in the last 120 days</div></div>
      <div class="badges"><span class="badge ice">${myFreezes()} streak freezes banked</span>
        ${misses === null ? "" : html`<span class="badge">${misses} double miss${misses === 1 ? "" : "es"} this season</span>`}</div>
    </section>
    <section class="panel"><h2>This week</h2>
      ${progressBar("Points", sumPoints(uid, weekOf(today)), t.weekPts, "pts")}
      ${hasBuiltin("writing") ? progressBar("Writing", writeMin, 7 * t.writeMin, "min") : ""}
      ${hasBuiltin("reading") ? progressBar("Reading", readMin, 7 * t.readMin, "min") : ""}
      <p class="hint">Hit your weekly points goal to earn a streak freeze.</p></section>
    <section class="panel spiralpanel"><h2>My spiral</h2>${spiral(spiralDays(uid), { size: 340, label: "My progress spiral" })}${spiralLegend()}</section>
    <section class="panel"><h2>Last 14 days</h2>
      <div class="bars" role="img" aria-label="Daily points for the last 14 days">${last14.map((d) => {
        const n = dayTotal(uid, d);
        return html`<div class="${n ? "" : "zero"}" style="height:${Math.max(2, (n / MAX_DAILY) * 100)}%" title="${d}: ${n} pts"></div>`;
      })}</div>
      <div class="barlbl" aria-hidden="true">${last14.map((d) => html`<span>${weekday(d)[0]}</span>`)}</div></section>
    <section class="panel"><h2>${monthName(mk)} against ${monthName(pmk)}</h2><div class="scroll"><table>
      <thead><tr><th></th><th class="n">${monthName(mk)}</th><th class="n">${monthName(pmk)}</th><th class="n">Change</th></tr></thead>
      <tbody>${row("Points", thisMonth.total, lastMonth.total)}${row("Days checked in", thisMonth.checkins, lastMonth.checkins)}</tbody></table></div></section>`;
}
