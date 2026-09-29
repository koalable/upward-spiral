// Today: the day's rings, today's to-dos and Work, then the check-in form. Streaks live on Progress.
import { html, todayKey, addDays, longDate, clock } from "../util.js";
import { BUILTINS, SCREEN_HABITS, WORKOUTS } from "../constants.js";
import { isScored, questionRule, writingMinutes, workoutMinutes } from "../scoring.js";
import { state, settings, isEditable, scoreOf } from "../state.js";
import { ringsView, patchRings } from "./rings.js";
import { answers } from "../day.js";
import { toggle, stepper, choices, zeroToFour, cardHead, saveStatus, icon } from "./components.js";
import { GROUPS, groupOf, iconOf, themeOf } from "../energy.js";
import { dashboardView } from "./dashboard.js";
import { medQuickLog, patchMedStatus } from "./meds.js";
import { isLadder, ladderStatus, levelLabel, levelOf } from "../ladder.js";
import { WEEK_GOAL_BONUS, LEVEL_UP_BONUS, EDIT_WINDOW_TEXT } from "../constants.js";
import { weekOf, weekday } from "../util.js";
import { normalizeLayout, sectionHidden, tabHidden } from "../layout.js";
import { breathingBanner, pausedNote, isPausedCat, breathingSheet } from "./breathing.js";

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
      ${t.substanceRule ? html`<p class="hint">Yours: ${t.substanceRule}</p>` : html`<p class="hint">Set what counts in Settings → Targets &amp; scoring.</p>`}
      <div class="row"><span class="lbl">Units today</span>${stepper("substances", a.substances, 0.5, "Units today")}<span class="muted small">limit ${t.substanceLimit}</span></div>`;
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

// An energy group folds up once every category in it has some points; its header shows the group's total.
function groupBlock(g, qs, a, t, lead, r) {
  const got = qs.reduce((n, q) => n + (r.points[q.id] || 0), 0), max = qs.length * 4;
  const filled = qs.every((q) => (r.points[q.id] || 0) > 0);
  return html`<details class="egroup" id="grp-${g.id}" ${filled ? "" : "open"}>
    <summary class="egrouphead ${g.theme}"><span class="gicon">${icon(g.icon)}</span><div class="max"><div class="tname">${g.themeName}</div><h3>${g.name}</h3></div>
      <span class="gpts" id="live-grp-${g.id}">${got} / ${max}</span><span class="gfold" aria-hidden="true">${icon("expand_more")}</span></summary>
    ${qs.map((q) => questionCard(q, a, t, q.id === lead, true))}</details>`;
}

export function todayView() {
  const s = settings(), a = answers(), t = s.targets, l = normalizeLayout(s.layout);
  const today = todayKey(), isToday = state.date === today, open = isEditable(state.date);
  const label = isToday ? "Today, " : state.date === addDays(today, -1) ? "Yesterday, " : "";
  const ladders = s.cats.filter(isLadder), r = scoreOf(state.date);
  const scored = s.cats.filter(isScored), extras = s.cats.filter((q) => !isScored(q) && !isLadder(q));
  const reflectShown = !tabHidden(l, "reflect");
  return html`
    <div class="daybar">
      <button class="iconbtn" data-act="shiftDay" data-by="-1" aria-label="Previous day">‹</button>
      <span class="date">${label}${longDate(state.date)}</span>
      <button class="iconbtn" data-act="shiftDay" data-by="1" aria-label="Next day" ${isToday ? "disabled" : ""}>›</button>
      ${isToday ? "" : html`<button class="linkbtn" data-act="goToday">Back to today</button>`}
      ${saveStatus()}
    </div>
    ${isToday && !sectionHidden(l, "breathing") ? breathingBanner() : ""}
    ${sectionHidden(l, "rings") ? "" : html`<div id="live-rings" data-live>${ringsView()}</div>`}
    ${isToday && !sectionHidden(l, "plate") ? html`<div id="live-dash">${dashboardView()}</div>` : ""}
    ${open ? "" : html`<div class="banner">This day is closed for editing. ${EDIT_WINDOW_TEXT}</div>`}
    ${isToday && !sectionHidden(l, "medlog") ? medQuickLog() : ""}
    <fieldset ${open ? "" : "disabled"}>
      ${ladders.map((q) => ladderCard(q, a))}
      ${GROUPS.map((g) => {
        const mine = scored.filter((q) => groupOf(q).id === g.id && !isPausedCat(q.id, state.date));
        return mine.length ? groupBlock(g, mine, a, t, s.lead, r) : "";
      })}
      ${pausedNote()}
      ${extras.length ? html`<h3 class="also">Also tracking <span class="muted small">(not scored)</span></h3>${extras.map((q) => questionCard(q, a, t, false))}` : ""}
      <section class="panel closeday"><h2>Close the day</h2>
        <div class="row">${toggle("dayOff", "Intentional rest day", a.dayOff)}</div>
        <p class="hint">A planned rest day keeps your streak and counts as showing up.</p>
        ${reflectShown ? html`<button class="reflectlink" data-act="openTab" data-tab="reflect">${icon("edit_note")}<span class="max">${a.reflection ? html`<b>Reflection</b><span class="small-text">${String(a.reflection).slice(0, 80)}${String(a.reflection).length > 80 ? "…" : ""}</span>` : html`<b>Reflect on today</b><span class="small-text">A line or two, private.</span>`}</span>${icon("chevron_right")}</button>` : ""}
        <div id="live-finish" class="finish"></div></section>
    </fieldset>
    <p class="privacy small muted">🔒 Your questions and answers are private. The group sees only your score, streak, and check-in.</p>
    ${breathingSheet()}`;
}

// ---------- live parts ----------
function finishBox(a) {
  return a.doneAt
    ? html`<span class="done">✓ Finished at ${clock(a.doneAt)}</span> <button class="linkbtn" data-act="unfinish">Undo</button>`
    : html`<button class="btn" data-act="finish">Finish today's check-in</button><span class="hint small">The group sees what time you finish.</span>`;
}

export function patchToday(view) {
  const set = (id, content) => { const el = view.querySelector(`#${id}`); if (el) el.innerHTML = String(content); };
  const a = answers(), r = scoreOf(state.date);
  patchRings(view.querySelector("#live-rings"));
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
  for (const g of GROUPS) {
    const el = view.querySelector(`#live-grp-${g.id}`);
    if (!el) continue;
    const qs = [...view.querySelectorAll(`#grp-${g.id} [data-points]`)].map((x) => x.dataset.points);
    el.textContent = `${qs.reduce((n, id) => n + (r.points[id] || 0), 0)} / ${qs.length * 4}`;
  }
  for (const q of settings().cats.filter(isLadder)) set(`live-ladder-${q.id}`, ladderProgress(q));
  patchMedStatus(view);
}
