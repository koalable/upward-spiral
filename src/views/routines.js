// Routines: today's rituals, the step-by-step ritual runner, and setting routines up. (Beer CSS markup)
import { read } from "../docs.js";
import { html, todayKey, addDays, longDate, atTime, clock } from "../util.js";
import { APP_NAME } from "../constants.js";
import { state, isEditable } from "../state.js";
import {
  DAY_LETTERS, EVERY_DAY, WEEKDAYS, normalizeRoutines, inRitual, doneCount, target, isDone, isScheduled,
  scheduleLabel, doneThisWeek, reminderDays,
} from "../routines.js";
import { dailyReminderLink } from "../calendar.js";
import { pressed, saveStatus, icon } from "./components.js";

export const routineData = () => read("routines");
export const findRitual = (id) => routineData().rituals.find((r) => r.id === id);
const clock12 = (hhmm) => new Date(atTime(todayKey(), hhmm)).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
export const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

// Today's due steps for a ritual, in order.
export const ritualSteps = (id, key = state.date) => inRitual(routineData().items, id).filter((r) => isScheduled(r, key, state.routinelog));

// ---------- today ----------
function mark(r, key, open) {
  const n = doneCount(r, key, state.routinelog), goal = target(r), done = n >= goal;
  if (goal > 1) {
    return html`<button class="chip${done ? " fill" : ""}" data-act="rCount" data-id="${r.id}" ${open ? "" : "disabled"}
      aria-label="${r.name}: ${n} of ${goal}. Tap to add one.">${n}/${goal}</button>`;
  }
  return html`<button class="circle ${done ? "" : "border"}" data-act="rToggle" data-id="${r.id}" aria-pressed="${pressed(done)}" ${open ? "" : "disabled"}
    aria-label="${done ? "Done" : "Mark done"}: ${r.name}">${done ? icon("check") : ""}</button>`;
}

function routineRow(r, key, open) {
  const done = isDone(r, key, state.routinelog);
  const week = r.perWeek ? ` · ${doneThisWeek(r, key, state.routinelog)}/${r.perWeek} this week` : "";
  return html`<li class="${done ? "done" : ""}">
    <span class="remoji" aria-hidden="true">${r.icon || "•"}</span>
    <div class="max"><div class="rname">${r.name}</div><div class="small-text">${scheduleLabel(r)}${r.minutes ? ` · ${r.minutes} min` : ""}${week}</div></div>
    ${mark(r, key, open)}</li>`;
}

function ritualCard(rit, key, open) {
  const steps = ritualSteps(rit.id, key);
  if (!steps.length) return "";
  const done = steps.filter((r) => isDone(r, key, state.routinelog)).length, all = done === steps.length;
  return html`<article class="round no-padding ritual themed dusk">
    <nav class="padding">
      ${icon(rit.icon || "checklist")}
      <div class="max"><h6>${rit.name}</h6><div class="small-text">${rit.time ? clock12(rit.time) + " · " : ""}${done} of ${steps.length} done</div></div>
      ${open && !all ? html`<button data-act="runStart" data-ritual="${rit.id}">${icon("play_arrow")}<span>${done ? "Resume" : "Start"}</span></button>` : ""}
      ${all ? html`<span class="chip fill">${icon("done_all")}Done</span>` : ""}
    </nav>
    <progress value="${Math.round((100 * done) / steps.length)}" max="100"></progress>
    <ul class="list">${steps.map((r) => routineRow(r, key, open))}</ul></article>`;
}

const STARTERS = [["morning", "Morning starter"], ["evening", "Evening starter"], ["work", "Workday starter"]];

function emptyState() {
  return html`<article class="round padding"><h5>Start with a ritual</h5>
    <p>A ritual is a saved sequence of habits you do in order, like a morning ritual or a work shutdown. Tap Start and the app walks you through one step at a time, so there's nothing to decide.</p>
    <nav class="wrap">${STARTERS.map(([id, label]) => html`<button class="border" data-act="rStarter" data-starter="${id}">${icon("add")}<span>${label}</span></button>`)}
      <button class="transparent" data-act="rNew">${icon("edit")}<span>Build my own</span></button></nav></article>`;
}

export function routinesView() {
  if (state.run) return runnerView();
  const { items, rituals } = routineData();
  if (!items.length) return emptyState();
  const key = state.date, today = todayKey(), open = isEditable(key);
  const label = key === today ? "Today" : key === addDays(today, -1) ? "Yesterday" : longDate(key);
  const later = items.filter((r) => !isScheduled(r, key, state.routinelog));
  return html`
    <nav class="daybar">
      <button class="circle transparent" data-act="shiftDay" data-by="-1" aria-label="Previous day">${icon("chevron_left")}</button>
      <h6 class="max center-align">${label}</h6>
      <button class="circle transparent" data-act="shiftDay" data-by="1" aria-label="Next day" ${key === today ? "disabled" : ""}>${icon("chevron_right")}</button></nav>
    ${open ? "" : html`<p class="small-text center-align">This day is closed for checking off.</p>`}
    ${rituals.map((rit) => ritualCard(rit, key, open))}
    ${later.length ? html`<details class="later"><summary class="small-text">Not scheduled ${key === today ? "today" : "this day"} (${later.length})</summary>
      <ul class="list">${later.map((r) => routineRow(r, key, open))}</ul></details>` : ""}
    <p class="small-text center-align">${icon("lock")} Private to you. ${saveStatus()}</p>`;
}

// ---------- the ritual runner: one step at a time ----------
function runnerView() {
  const rit = findRitual(state.run.ritual), steps = ritualSteps(state.run.ritual);
  const i = state.run.index, step = steps[i];
  if (!step) {
    return html`<article class="round padding center-align runner">
      <div class="big-emoji" aria-hidden="true">🎉</div><h4>${rit?.name || "Ritual"} done</h4>
      <p>${steps.filter((r) => isDone(r, state.date, state.routinelog)).length} of ${steps.length} steps checked off.</p>
      <button class="large" data-act="runExit">${icon("arrow_back")}<span>Back to rituals</span></button></article>`;
  }
  const t = state.timer?.id === step.id ? state.timer : null;
  return html`<article class="round padding runner">
    <nav><button class="circle transparent" data-act="runExit" aria-label="Exit ritual">${icon("close")}</button>
      <div class="max center-align small-text">${rit?.name} · step ${i + 1} of ${steps.length}</div><span class="w48"></span></nav>
    <progress value="${Math.round((100 * i) / steps.length)}" max="100"></progress>
    <div class="center-align step">
      <div class="big-emoji" aria-hidden="true">${step.icon || "•"}</div>
      <h4>${step.name}</h4>
      ${step.minutes ? html`<div class="timer" id="run-timer">${t ? mmss(t.end - Date.now()) : `${step.minutes}:00`}</div>
        <button class="border" data-act="rTimer" data-id="${step.id}">${icon(t ? "stop" : "timer")}<span>${t ? "Stop timer" : "Start timer"}</span></button>` : ""}
    </div>
    <nav class="center-align">
      <button class="transparent" data-act="runSkip">${icon("skip_next")}<span>Skip</span></button>
      <button class="large" data-act="runDone">${icon("check")}<span>Done</span></button></nav></article>`;
}

// ---------- set up ----------
const MODES = [["daily", "Every day"], ["weekdays", "Weekdays"], ["days", "Pick days"], ["perweek", "× a week"]];
export const modeOf = (r) => (r.perWeek ? "perweek" : !r.days || r.days.length === 7 ? "daily" : r.days.join() === WEEKDAYS.join() ? "weekdays" : "days");
const field = (label, input) => html`<label class="field"><span>${label}</span>${input}</label>`;

function routineForm() {
  const e = state.editRoutine;
  if (!e) return html`<nav class="wrap"><button data-act="rNew">${icon("add")}<span>Add a habit</span></button>
    <button class="border" data-act="ritNew">${icon("playlist_add")}<span>New ritual</span></button></nav>`;
  const mode = e.mode || modeOf(e), days = e.days || EVERY_DAY;
  return html`<article class="border round padding"><h6>${e.id ? "Edit habit" : "New habit"}</h6>
    <div class="grid">
      <div class="s12 m6">${field("Name", html`<input placeholder=" " id="r-name" maxlength="60" value="${e.name || ""}">`)}</div>
      <div class="s6 m3">${field("Emoji", html`<input placeholder=" " id="r-icon" maxlength="4" value="${e.icon || ""}">`)}</div>
      <div class="s6 m3">${field("Ritual", html`<select id="r-group">${routineData().rituals.map((r) => html`<option value="${r.id}" ${r.id === (e.group || "morning") ? "selected" : ""}>${r.name}</option>`)}</select>`)}</div>
      <div class="s6 m3">${field("Times a day", html`<input placeholder=" " id="r-times" type="number" min="1" max="20" value="${e.times || 1}">`)}</div>
      <div class="s6 m3">${field("Timer (min)", html`<input placeholder=" " id="r-minutes" type="number" min="0" max="240" value="${e.minutes || ""}">`)}</div>
    </div>
    <nav class="wrap no-space">${MODES.map(([m, label]) => html`<button class="${m === mode ? "fill" : "border"} chip" data-act="rMode" data-mode="${m}">${label}</button>`)}</nav>
    ${mode === "days" ? html`<nav class="wrap no-space">${DAY_LETTERS.map((l, d) => html`<button class="chip ${days.includes(d) ? "fill" : "border"}" data-act="rDay" data-day="${d}" aria-pressed="${pressed(days.includes(d))}">${l}</button>`)}</nav>` : ""}
    ${mode === "perweek" ? field("Times a week (any days)", html`<input placeholder=" " id="r-perweek" type="number" min="1" max="7" value="${e.perWeek || 3}">`) : ""}
    <nav><button data-act="rSave">Save</button><button class="transparent" data-act="rCancel">Cancel</button></nav></article>`;
}

function ritualForm() {
  const e = state.editRitual;
  if (!e) return "";
  return html`<article class="border round padding"><h6>${e.id ? "Edit ritual" : "New ritual"}</h6>
    <div class="grid"><div class="s12 m8">${field("Name", html`<input placeholder=" " id="rit-name" maxlength="40" value="${e.name || ""}" placeholder="Workday shutdown">`)}</div>
      <div class="s12 m4">${field("Time (optional)", html`<input placeholder=" " id="rit-time" type="time" value="${e.time || ""}">`)}</div></div>
    <nav><button data-act="ritSave">Save</button><button class="transparent" data-act="ritCancel">Cancel</button>
      ${e.id && e.custom ? html`<button class="transparent error-text" data-act="ritRemove">Delete ritual</button>` : ""}</nav></article>`;
}

export function reminderOpts(id) {
  const rit = findRitual(id), list = inRitual(routineData().items, id);
  return { title: `${rit.name} ritual`, time: rit.time || "09:00", days: reminderDays(list), details: `${list.map((r) => r.name).join(", ")}\n\n${APP_NAME}: ${location.href}` };
}
export const reminderHref = (id) => dailyReminderLink(reminderOpts(id));

export function routineSetupView() {
  const { items, rituals } = routineData();
  const sections = rituals.map((rit) => {
    const mine = items.map((r, i) => [r, i]).filter(([r]) => (r.group || "anytime") === rit.id);
    return html`<article class="round no-padding"><nav class="padding">${icon(rit.icon || "checklist")}<h6 class="max">${rit.name}</h6>
        ${rit.time ? html`<span class="small-text">${icon("bell")} ${clock(atTime(todayKey(), rit.time))}</span>` : ""}
        <button class="circle transparent" data-act="ritEdit" data-id="${rit.id}" aria-label="Edit ${rit.name}">${icon("edit")}</button></nav>
      ${mine.length ? html`<ul class="list">${mine.map(([r, i]) => html`<li>
        <span class="remoji" aria-hidden="true">${r.icon || "•"}</span>
        <div class="max"><div>${r.name}</div><div class="small-text">${scheduleLabel(r)}${target(r) > 1 ? ` · ${target(r)}× a day` : ""}${r.minutes ? ` · ${r.minutes} min` : ""}</div></div>
        <button class="circle transparent" data-act="rMove" data-index="${i}" data-by="-1" aria-label="Move up">${icon("arrow_upward")}</button>
        <button class="circle transparent" data-act="rMove" data-index="${i}" data-by="1" aria-label="Move down">${icon("arrow_downward")}</button>
        <button class="circle transparent" data-act="rEdit" data-index="${i}" aria-label="Edit ${r.name}">${icon("edit")}</button>
        <button class="circle transparent" data-act="rRemove" data-index="${i}" aria-label="Remove ${r.name}">${icon("delete")}</button></li>`)}</ul>`
        : html`<p class="padding small-text">No steps yet.</p>`}</article>`;
  });
  return html`${routineForm()}${ritualForm()}${sections}
    <p class="small-text">Steps run in this order. A ritual with a start time sends a phone notification then (turn it on under Check-in → Notifications). ${saveStatus()}</p>`;
}

// Reads the open routine form into state.editRoutine so a redraw doesn't lose typing.
export function readRoutineForm(view) {
  const val = (id) => view.querySelector(`#${id}`)?.value;
  const e = state.editRoutine;
  if (e && val("r-name") !== undefined) {
    Object.assign(e, {
      name: val("r-name").trim(), icon: val("r-icon").trim(), group: val("r-group"),
      times: Math.max(1, Math.min(20, Number(val("r-times")) || 1)),
      minutes: Math.max(0, Math.min(240, Number(val("r-minutes")) || 0)),
    });
    if (val("r-perweek") !== undefined) e.perWeek = Math.max(1, Math.min(7, Number(val("r-perweek")) || 1));
  }
  const r = state.editRitual;
  if (r && val("rit-name") !== undefined) Object.assign(r, { name: val("rit-name").trim(), time: val("rit-time") || "" });
}

export function patchRoutines(view) {
  const t = state.timer, el = t && view.querySelector("#run-timer");
  if (el) el.textContent = mmss(t.end - Date.now());
}
