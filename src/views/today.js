// Today: the daily check-in form, plus live bits (score, streak, banners) that update in place.
import { html, todayKey, addDays, dateRange, longDate, shortDate, clock } from "../util.js";
import { BUILTINS, SCREEN_HABITS, WORKOUTS, MAX_DAILY } from "../constants.js";
import { isScored, questionRule, writingMinutes, workoutMinutes, scoreDay } from "../scoring.js";
import {
  state, settings, isEditable, scoreOf, leadName, floorNames, currentSeason, currentStreak,
  myFreezes, isStreakDay, joinedBy, showedUp,
} from "../state.js";
import { answers } from "../day.js";
import { toggle, stepper, choices, zeroToFour, cardHead, saveStatus, icon } from "./components.js";
import { GROUPS, groupOf, iconOf, themeOf } from "../energy.js";
import { dashboardView } from "./dashboard.js";
import { medQuickLog, patchMedStatus } from "./meds.js";
import { isLadder, ladderStatus, levelLabel, levelOf } from "../ladder.js";
import { WEEK_GOAL_BONUS, LEVEL_UP_BONUS, EDIT_WINDOW_TEXT } from "../constants.js";
import { weekOf, weekday } from "../util.js";

const fieldValue = (v) => v ?? "";

function builtinCard(id, a, t) {
  const hint = html`<p class="hint">${BUILTINS[id].rule}</p>`;
  switch (id) {
    case "writing": return html`
      ${hint}
      <div class="chips">${[15, 30, 45, 60, 90].map((m) => html`<button class="chip" data-act="addSession" data-minutes="${m}">+${m} min</button>`)}</div>
      <div class="row">
        <input class="field" type="number" min="1" inputmode="numeric" id="wCustom" placeholder="Minutes" aria-label="Custom minutes">
        <input class="field wide" id="wNote" placeholder="What you worked on (optional)" aria-label="Session note">
        <button class="btn ghost" data-act="addCustomSession">Add session</button>
      </div>
      <ul class="sessions">${a.sessions.map((s, i) => html`
        <li><span>${s.m} min ${s.note ? html`<span class="muted">${s.note}</span>` : ""}</span>
        <button class="x" data-act="removeSession" data-index="${i}" aria-label="Remove session">×</button></li>`)}</ul>
      <div class="row"><span class="muted">Total</span><span class="total" id="live-writing"></span></div>`;
    case "reading": return html`${hint}<div class="row">${stepper("reading", a.reading, 15, "Reading minutes")}<span class="muted">minutes</span></div>`;
    case "sleep": return html`${hint}
      <div class="row"><label class="lbl" for="wlc-bed">Went to bed</label><input class="field" type="time" id="wlc-bed" data-answer="bed" value="${fieldValue(a.bed)}"><span class="muted small">target ${t.bedTarget}</span><span class="pts" id="live-bed"></span></div>
      <div class="row"><label class="lbl" for="wlc-wake">Woke up</label><input class="field" type="time" id="wlc-wake" data-answer="wake" value="${fieldValue(a.wake)}"><span class="muted small">target ${t.wakeTarget}</span><span class="pts" id="live-wake"></span></div>`;
    case "diet": {
      const penalty = [[0, "None"], [1, "Some −1"], [2, "Excess −2"]];
      return html`${hint}
        <div class="row"><label class="lbl" for="wlc-cal">Calories</label><input class="field" id="wlc-cal" type="number" inputmode="numeric" min="0" data-answer="calories" value="${fieldValue(a.calories)}"><span class="muted small">target ${t.calTarget}</span></div>
        <div class="row"><label class="lbl" for="wlc-pro">Protein (g)</label><input class="field" id="wlc-pro" type="number" inputmode="numeric" min="0" data-answer="protein" value="${fieldValue(a.protein)}"><span class="muted small">goal ${t.proteinTarget} g</span></div>
        <div class="row">${toggle("fruitVeg", "Hit my fruit and veg goal", a.fruitVeg)}</div>
        <div class="row"><span class="lbl">Processed sugar</span>${choices("sugar", penalty, a.sugar, "warn")}</div>
        <div class="row"><span class="lbl">Processed food</span>${choices("processed", penalty, a.processed, "warn")}</div>`;
    }
    case "substances": return html`${hint}
      ${t.substanceRule ? html`<p class="hint">Yours: ${t.substanceRule}</p>` : html`<p class="hint">Set what counts under Targets &amp; rules.</p>`}
      <div class="row"><span class="lbl">Units today</span>${stepper("substances", a.substances, 1, "Units today")}<span class="muted small">limit ${t.substanceLimit}</span></div>`;
    case "movement": return html`${hint}
      <div class="sub"><span>Walking</span><span class="pts" id="live-walk"></span></div>
      <div class="row"><label class="lbl" for="wlc-steps">Steps</label><input class="field" id="wlc-steps" type="number" inputmode="numeric" min="0" step="500" data-answer="steps" value="${fieldValue(a.steps)}"></div>
      <div class="row"><span class="lbl">Walking min</span>${stepper("walkMin", a.walkMin, 15, "Walking minutes")}</div>
      <div class="sub"><span>Workout</span><span class="pts" id="live-workout"></span></div>
      ${WORKOUTS.map(([id, label]) => html`<div class="row"><span class="lbl">${label}</span>${stepper(`ex.${id}`, a.ex[id], 5, `${label} minutes`)}</div>`)}
      <div class="row"><span class="muted">Workout total</span><span class="total" id="live-workout-min"></span></div>`;
    case "screen": return html`${hint}<div class="row">${SCREEN_HABITS.map(([key, label]) => toggle(key, label, a[key]))}</div>`;
    case "practices": {
      const items = [["journal", "Journaling"], ["meditate", "Mindfulness / meditation"], ...(t.customPractice ? [["custom", t.customPractice]] : [])];
      return html`${hint}<div class="row">${items.map(([key, label]) => toggle(key, label, a[key]))}</div>
        <div class="row"><span class="lbl">Effort</span>${choices("effort", zeroToFour, a.effort)}</div>`;
    }
    default: return "";
  }
}

function customCard(q, a) {
  const path = `c.${q.id}`, value = a.c[q.id];
  switch (q.kind) {
    case "check": return html`<div class="row">${q.items.map((item, i) => toggle(`${path}.${i}`, item, value?.[i]))}</div>`;
    case "number": return html`<div class="row">${stepper(path, value, q.step || 1, q.name)}${q.unit ? html`<span class="muted">${q.unit}</span>` : ""}
      ${q.scored ? html`<span class="muted small">${q.dir === "max" ? "limit" : "target"} ${q.target}</span>` : ""}</div>`;
    case "scale": return html`<div class="row">${choices(path, zeroToFour, value)}</div>`;
    default: return html`<textarea class="field" data-answer="${path}" rows="2" aria-label="${q.name}">${value || ""}</textarea>`;
  }
}

function questionCard(q, a, t, lead, themed = false) {
  const scored = isScored(q);
  const name = q.kind === "builtin" ? BUILTINS[q.id].name : q.name;
  const title = themed ? html`<span class="tchip">${icon(iconOf(q))}</span>${name}` : name;
  const body = q.kind === "builtin" ? builtinCard(q.id, a, t) : html`${scored ? html`<p class="hint">${questionRule(q)}</p>` : ""}${customCard(q, a)}`;
  return html`<section class="cat${lead ? " lead" : ""}${themed ? ` themed ${themeOf(q)}` : ""}">${cardHead(title, scored ? q.id : null)}${body}</section>`;
}

function ladderCard(q, a) {
  const lvl = levelOf(q), value = a.c[q.id];
  const control = q.mode === "minutes"
    ? html`<div class="row">${stepper(`c.${q.id}`, value, 5, `${q.name} minutes`)}<span class="muted">min · goal ${lvl.minutes}</span></div>`
    : html`<div class="row">${toggle(`c.${q.id}`, "Did it today", value === true)}</div>`;
  return html`<section class="cat ladder">
    <div class="cat-head"><h2>${q.name}</h2><span class="lvlbadge">Level ${lvl.number} of ${lvl.count}</span></div>
    <p class="hint">Goal: ${levelLabel(q, lvl)}. Not part of your daily score; hitting it earns bonus points.</p>
    ${control}<div id="live-ladder-${q.id}" class="ladderlive"></div></section>`;
}

function ladderProgress(q) {
  const s = ladderStatus(q, state.days), today = todayKey();
  const dots = weekOf(today).map((d, i) => html`<span class="wd${s.thisWeek.done[i] ? " on" : ""}${d === today ? " today" : ""}" title="${weekday(d)}">${weekday(d)[0]}</span>`);
  const week = s.thisWeek.hitOn
    ? html`<span class="up">✓ Weekly goal hit · +${WEEK_GOAL_BONUS}</span>`
    : html`<span class="muted">${s.thisWeek.count} of ${s.thisWeek.quota} this week</span>`;
  const next = s.level.isTop ? "" : ` to reach level ${s.level.number + 1}`;
  let milestone = html`<p class="small muted">${s.run} of ${s.need} weeks in a row${next}.</p>`;
  if (s.completedOn && q.stayedAt !== s.level.index) {
    milestone = html`<div class="banner good levelup"><b>🎉 Level ${s.level.number} complete! +${LEVEL_UP_BONUS} bonus.</b>
      ${s.level.isTop
        ? html` You've done every level. Add a harder one under Categories whenever you're ready.`
        : html` <button class="btn" data-act="levelUp" data-id="${q.id}">Move up: ${levelLabel(q, levelOf(q, s.level.index + 1))}</button>
          <button class="linkbtn" data-act="stayLevel" data-id="${q.id}">Stay here for now</button>`}</div>`;
  } else if (s.completedOn && !s.level.isTop) {
    milestone = html`<p class="small muted">Level ${s.level.number} complete. <button class="linkbtn" data-act="levelUp" data-id="${q.id}">Move up when you're ready</button></p>`;
  }
  return html`<div class="weekdots" aria-label="This week">${dots}</div> ${week}${milestone}`;
}

function seasonBanner() {
  const s = currentSeason();
  if (!s) return "";
  if (s.phase === "upcoming") return html`<div class="banner">Season ${s.n} starts ${longDate(s.start)}.</div>`;
  if (s.phase === "active") return html`<div class="banner good">Season ${s.n}, week ${s.week} of 6. Ends ${shortDate(s.end)}.</div>`;
  if (s.phase === "break") return html`<div class="banner">Season ${s.n} is over. Break until ${shortDate(s.breakEnd)}.</div>`;
  return "";
}

export function todayView() {
  const s = settings(), a = answers(), t = s.targets;
  const today = todayKey(), isToday = state.date === today, open = isEditable(state.date);
  const label = isToday ? "Today, " : state.date === addDays(today, -1) ? "Yesterday, " : "";
  const ladders = s.cats.filter(isLadder);
  const scored = s.cats.filter(isScored), extras = s.cats.filter((q) => !isScored(q) && !isLadder(q));
  return html`
    <div class="daybar">
      <button class="iconbtn" data-act="shiftDay" data-by="-1" aria-label="Previous day">‹</button>
      <span class="date">${label}${longDate(state.date)}</span>
      <button class="iconbtn" data-act="shiftDay" data-by="1" aria-label="Next day" ${isToday ? "disabled" : ""}>›</button>
      ${isToday ? "" : html`<button class="linkbtn" data-act="goToday">Back to today</button>`}
      ${saveStatus()}
    </div>
    ${seasonBanner()}
    <div id="live-miss"></div>
    ${open ? "" : html`<div class="banner">This day is closed for editing. ${EDIT_WINDOW_TEXT}</div>`}
    <p class="privacy small muted">🔒 Your questions and answers are private. The group sees only your score, streak, and check-in.</p>
    <section class="hero" id="live-hero"></section>
    <div id="live-freeze"></div>
    ${isToday ? dashboardView() : ""}
    ${isToday ? medQuickLog() : ""}
    <fieldset ${open ? "" : "disabled"}>
      ${ladders.map((q) => ladderCard(q, a))}
      ${GROUPS.map((g) => {
        const mine = scored.filter((q) => groupOf(q).id === g.id);
        return mine.length ? html`<div class="egrouphead ${g.theme}"><span class="gicon">${icon(g.icon)}</span><div><div class="tname">${g.themeName}</div><h3>${g.name}</h3></div></div>
          ${mine.map((q) => questionCard(q, a, t, q.id === s.lead, true))}` : "";
      })}
      ${extras.length ? html`<h3 class="also">Also tracking <span class="muted small">(not scored)</span></h3>${extras.map((q) => questionCard(q, a, t, false))}` : ""}
      <section class="cat">${cardHead("Rest day")}<div class="row">${toggle("dayOff", "Intentional day off", a.dayOff)}</div>
        <p class="hint">A planned day off keeps your streak and counts as showing up.</p></section>
      <section class="cat">${cardHead("Reflection")}<p class="hint">A line for the day. Saved privately under Journal.</p>
        <textarea class="field" data-answer="reflection" rows="4" placeholder="Today…" aria-label="Reflection">${a.reflection || ""}</textarea></section>
      <div id="live-finish" class="finish"></div>
    </fieldset>`;
}

// ---------- live parts ----------
function hero(r) {
  const streak = currentStreak(state.uid), freezes = myFreezes(), today = todayKey();
  const tally = dateRange(addDays(today, -29), today).map((d) => {
    let cls = "";
    if (isStreakDay(state.uid, d)) {
      const day = state.days[d];
      cls = scoreDay(day, settings()).leadMet ? "on" : day?.a?.freeze ? "frz" : "off";
    }
    return html`<i class="${cls}${d === state.date ? " today" : ""}" title="${d}"></i>`;
  });
  return html`
    <div><div class="big num">${r.total}<small> / ${MAX_DAILY}</small></div><div class="cap">Points for this day</div></div>
    <div><div class="big num streaknum">${streak.days}${streak.capped ? "+" : ""}<small> day ${leadName().toLowerCase()} streak</small></div>
      <div class="tally" aria-hidden="true">${tally}</div></div>
    <div class="badges">
      <span class="badge ${r.floorMet ? "on" : ""}">${r.floorMet ? "✓ Floor day met" : "Floor day not met yet"}</span>
      <span class="badge ${r.logged ? "on" : ""}">${r.logged ? "✓ Checked in" : "Not checked in"}</span>
      <span class="badge ice">${freezes} streak freeze${freezes === 1 ? "" : "s"}</span>
    </div>`;
}

function freezeBanner(r, a) {
  if (!isEditable(state.date)) return "";
  if (a.freeze) return html`<div class="banner good">Streak freeze used for this day. <button class="linkbtn" data-act="unfreeze">Undo</button></div>`;
  const n = myFreezes();
  if (r.leadMet || !n) return "";
  return html`<div class="banner">No ${leadName().toLowerCase()} logged for this day yet. <button class="btn ice" data-act="freeze">Use a streak freeze</button> <span class="small muted">${n} available</span></div>`;
}

function missBanner() {
  const today = todayKey(), yesterday = addDays(today, -1);
  if (state.date !== today || !joinedBy(state.uid, yesterday) || showedUp(state.uid, yesterday)) return "";
  if (showedUp(state.uid, today)) return html`<div class="banner good">Yesterday was a miss, and today you showed up. Rule kept.</div>`;
  return html`<div class="banner bad">Yesterday was a miss. A floor day today keeps the never-miss-twice rule: at least 1 point in ${floorNames()}.</div>`;
}

function finishBox(a) {
  return a.doneAt
    ? html`<span class="done">✓ Finished at ${clock(a.doneAt)}</span> <button class="linkbtn" data-act="unfinish">Undo</button>`
    : html`<button class="btn" data-act="finish">Finish today's check-in</button><span class="hint small">The group sees what time you finish.</span>`;
}

export function patchToday(view) {
  const set = (id, content) => { const el = view.querySelector(`#${id}`); if (el) el.innerHTML = String(content); };
  const a = answers(), r = scoreOf(state.date);
  set("live-hero", hero(r));
  set("live-freeze", freezeBanner(r, a));
  set("live-miss", missBanner());
  set("live-finish", finishBox(a));
  view.querySelectorAll("[data-points]").forEach((el) => {
    const p = r.points[el.dataset.points] || 0;
    el.textContent = `${p} / 4`;
    el.classList.toggle("zero", !p);
  });
  const text = (id, value) => { const el = view.querySelector(`#${id}`); if (el) el.textContent = value; };
  const pts = (n) => `${n} ${n === 1 ? "pt" : "pts"}`;
  text("live-writing", `${writingMinutes(a)} min`);
  text("live-bed", pts(r.detail.bed));
  text("live-wake", pts(r.detail.wake));
  text("live-walk", `${r.detail.walk} / 2`);
  text("live-workout", `${r.detail.workout} / 2`);
  text("live-workout-min", `${workoutMinutes(a)} min`);
  for (const q of settings().cats.filter(isLadder)) set(`live-ladder-${q.id}`, ladderProgress(q));
  patchMedStatus(view);
}
