// Group: season, today's status, leaderboard, check-in grid, and the weekly reset.
import { html, todayKey, addDays, weekOf, weekStart, dateRange, shortDate, weekday, clock } from "../util.js";
import { MAX_DAILY } from "../constants.js";
import {
  state, currentSeason, sumPoints, currentStreak, freezesOf, joinedBy, showedUp, checkedIn, dayTotal, sharedScore,
} from "../state.js";
import { who, change, saveStatus, pressed } from "./components.js";
import { spiral, spiralDays, spiralLegend } from "./spiral.js";

function nextMonday() {
  const today = todayKey(), monday = weekStart(today);
  return monday === today ? today : addDays(monday, 7);
}

function seasonPanel() {
  const s = currentSeason();
  const starter = html`
    <div class="row"><label class="lbl" for="wlc-season">Start date</label><input class="field" type="date" id="wlc-season" value="${nextMonday()}">
      <button class="btn" data-act="startSeason">Start season ${s ? s.n + 1 : 1}</button></div>
    <p class="hint">Seasons run 6 weeks, then a 3-day break.</p>`;
  if (!s) return html`<section class="panel"><h2>Start the first season</h2>${starter}</section>`;

  const finished = s.phase === "break" || s.phase === "over";
  const title = s.phase === "upcoming" ? `Season ${s.n} starts ${shortDate(s.start)}` : s.phase === "active" ? `Season ${s.n}: week ${s.week} of 6` : `Season ${s.n} results`;
  let winner = "";
  if (finished) {
    const best = Object.keys(state.members).map((uid) => ({ uid, pts: sumPoints(uid, dateRange(s.start, s.end)) })).sort((a, b) => b.pts - a.pts)[0];
    if (best) winner = html`<p><b>Season ${s.n} winner: ${who(best.uid)}</b>, ${best.pts} points.</p>`;
  }
  const mover = s.phase === "upcoming" ? html`
    <div class="row"><label class="lbl" for="wlc-season">Change start</label><input class="field" type="date" id="wlc-season" value="${s.start}">
      <button class="btn ghost" data-act="moveSeason">Update</button></div>` : "";
  return html`<section class="panel"><h2>${title}</h2><p class="muted small">${shortDate(s.start)} to ${shortDate(s.end)}</p>${winner}${finished ? starter : mover}</section>`;
}

export function shareRow(win, shared) {
  if (!win || !win.trim()) return html`<span class="muted small">Write a win to share it.</span>`;
  if (!shared) return html`<button class="btn ghost" data-act="shareWin">Share my win with the group</button>`;
  const unshare = html`<button class="linkbtn" data-act="unshareWin">Unshare</button>`;
  return shared.text === win ? html`<span class="small">✓ Shared with the group</span> ${unshare}` : html`<button class="btn ghost" data-act="shareWin">Update shared win</button> ${unshare}`;
}

function resetPanel() {
  const week = weekStart(todayKey()), mine = state.weekly[week] || {};
  const shared = state.wins[`${state.uid}_${week}`];
  const wins = Object.keys(state.members).map((uid) => state.wins[`${uid}_${week}`]).filter((w) => w?.text);
  const box = (key, id, label) => html`<div class="row block"><label class="small muted" for="${id}">${label}</label><textarea class="field" id="${id}" data-weekly="${key}">${mine[key] || ""}</textarea></div>`;
  return html`<section class="panel"><h2>Weekly reset</h2>
    <p class="hint">Private unless you share your win. Your week's score is ${sumPoints(state.uid, weekOf(todayKey()))}.</p>
    ${box("win", "wlc-win", "One win")}<div id="share-row">${shareRow(mine.win, shared)}</div>
    ${box("adjust", "wlc-adj", "One adjustment")}${box("next", "wlc-next", "Next week's goals")}${saveStatus()}
    ${wins.length ? html`<h2 class="spaced">Wins this week</h2>${wins.map((w) => html`<div class="reflect"><b>${who(w.uid)}</b><p>${w.text}</p></div>`)}` : ""}
  </section>`;
}

function todayPanel(uids) {
  const today = todayKey();
  const status = (uid) => {
    const s = sharedScore(uid, today);
    if (s?.doneAt) return html`<span class="up">✓ Finished ${clock(s.doneAt)}</span>`;
    if (s?.logged) return html`<span class="muted">In progress · last entry ${clock(s.updated)}</span>`;
    return html`<span class="muted">Not checked in yet</span>`;
  };
  return html`<section class="panel"><h2>Today</h2><div class="scroll"><table><tbody>${uids.map((uid) => html`<tr><td>${who(uid)}</td><td class="n">${status(uid)}</td></tr>`)}</tbody></table></div></section>`;
}

function checkinGrid(uids) {
  const today = todayKey(), days = weekOf(today);
  const cell = (uid, d) => {
    if (d > today) return html`<span class="cell muted">·</span>`;
    if (!checkedIn(uid, d)) return html`<span class="cell empty" aria-label="Not logged">–</span>`;
    const n = dayTotal(uid, d), strength = Math.max(0.15, Math.min(1, n / MAX_DAILY));
    const done = sharedScore(uid, d)?.doneAt;
    const label = `${n} points, ${showedUp(uid, d) ? "showed up" : "floor not met"}${done ? ", finished " + clock(done) : ""}`;
    return html`<span class="cell" title="${label}" aria-label="${label}" style="background:color-mix(in srgb, var(--accent) ${Math.round(strength * 100)}%, transparent);color:${strength > 0.55 ? "var(--on-accent)" : "var(--ink)"}">${n}</span>`;
  };
  return html`<section class="panel"><h2>This week's check-ins</h2><div class="scroll"><table>
    <thead><tr><th>Member</th>${days.map((d) => html`<th class="n">${weekday(d)}</th>`)}</tr></thead>
    <tbody>${uids.map((uid) => html`<tr><td>${who(uid)}</td>${days.map((d) => html`<td class="n">${cell(uid, d)}</td>`)}</tr>`)}</tbody></table></div>
    <p class="muted small">Daily points out of ${MAX_DAILY}. A dash means nothing was logged. Everyone plays their own questions, scaled so each total is out of ${MAX_DAILY}.</p></section>`;
}

export function groupView() {
  const uids = Object.keys(state.members);
  if (!uids.length) return html`<section class="panel"><h2>No one has joined yet</h2><p>Open the Today tab and join to start the board.</p></section>`;

  const today = todayKey(), s = currentSeason();
  const weekly = state.board === "week" || !s;
  const dates = weekly ? weekOf(today) : dateRange(s.start, s.end);
  const previous = weekly ? weekOf(addDays(weekStart(today), -1)) : null;
  const rows = uids.map((uid) => ({ uid, now: sumPoints(uid, dates), before: previous ? sumPoints(uid, previous) : 0, streak: currentStreak(uid), freezes: freezesOf(uid) }))
    .sort((a, b) => b.now - a.now);

  let rank = 0, lastScore = null;
  const board = rows.map((r, i) => {
    if (r.now !== lastScore) { rank = i + 1; lastScore = r.now; }
    return html`<tr class="${r.uid === state.uid ? "me" : ""}"><td class="rank">${rank}</td><td>${who(r.uid)}</td><td class="n num strong">${r.now}</td>
      ${weekly ? html`<td class="n">${change(r.now, r.before)}</td>` : ""}
      <td class="n">${r.streak.days}${r.streak.capped ? "+" : ""} day${r.streak.days === 1 ? "" : "s"}</td><td class="n">${r.freezes}</td></tr>`;
  });

  const yesterday = addDays(today, -1);
  const atRisk = uids.filter((uid) => joinedBy(uid, yesterday) && !showedUp(uid, yesterday) && !showedUp(uid, today));
  const risk = atRisk.length
    ? html`<div class="banner bad">${atRisk.map((uid, i) => html`${i ? ", " : ""}${who(uid)}`)} missed yesterday and ${atRisk.length === 1 ? "hasn't" : "haven't"} logged a floor day yet today. Never miss twice.</div>`
    : html`<div class="banner good">No one is at risk of a second miss.</div>`;

  const spirals = html`<section class="panel"><h2>Our spirals</h2><div class="spiralgrid">${uids.map((uid) => html`
    <figure>${spiral(spiralDays(uid), { size: 200, label: `${state.members[uid]?.display || state.members[uid]?.name || "Member"}'s spiral` })}<figcaption>${who(uid)}</figcaption></figure>`)}</div>${spiralLegend()}</section>`;
  return html`${seasonPanel()}${risk}${todayPanel(uids)}${spirals}
    <div class="row boardswitch"><span class="seg">
      <button data-act="board" data-board="week" aria-pressed="${pressed(weekly)}">This week</button>
      ${s ? html`<button data-act="board" data-board="season" aria-pressed="${pressed(!weekly)}">This season</button>` : ""}</span></div>
    <section class="panel"><h2>Leaderboard</h2><div class="scroll"><table>
      <thead><tr><th><span class="sr-only">Rank</span></th><th>Member</th><th class="n">Points</th>${weekly ? html`<th class="n">vs their last week</th>` : ""}<th class="n">Streak</th><th class="n">Freezes</th></tr></thead>
      <tbody>${board}</tbody></table></div></section>
    ${checkinGrid(uids)}${resetPanel()}`;
}
