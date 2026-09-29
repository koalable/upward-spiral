// Work: Today (a few tasks, picked for you) and Goals (goal → milestones → tasks, with progress).
import { html, shortDate, longDate, clock, atTime } from "../util.js";
import { state } from "../state.js";
import { normalizeWork, todayState, todayPicks, blocker, progress, countdown, goalTheme, milestoneTheme, msIcon, goalIcon, MS_ICONS } from "../work.js";
import { getPref } from "../prefs.js";
import { timerFor, isRunning, isUp, msLeft, minutesLeft, countdownText, durationText } from "../timer.js";
import { pressed, saveStatus, icon } from "./components.js";

export const workData = () => normalizeWork(state.work);
const field = (label, input) => html`<label class="field"><span>${label}</span>${input}</label>`;
const goalOf = (w, id) => w.goals.find((g) => g.id === id);
const msOf = (w, id) => w.milestones.find((m) => m.id === id);

function dueLabel(t, key) {
  if (!t.due) return "";
  if (t.done) return `due ${shortDate(t.due)}`;
  if (t.due < key) return html`<span class="badge bad">Overdue · ${shortDate(t.due)}</span>`;
  if (t.due === key) return html`<span class="badge on">Due today</span>`;
  return `due ${shortDate(t.due)}`;
}

const startAt = (t) => (t.at ? clock(atTime("2000-01-01", t.at)) : "");
// "1h 10m of 2h", "40m", "2h"
function timeText(t) {
  const spent = Number(t.spent) || 0;
  if (spent && t.hours) return `${durationText(spent)} of ${durationText(t.hours * 60)}`;
  if (spent) return `${durationText(spent)} spent`;
  return t.hours ? `${t.hours}h` : "";
}

// Bits of text joined with " · ", then the due date.
const meta = (bits, t, key) => html`${bits.filter(Boolean).join(" · ")}${bits.some(Boolean) && t.due ? " · " : ""}${dueLabel(t, key)}`;

function check(t, open = true) {
  return html`<button class="circle ${t.done ? "" : "border"}" data-act="wToggle" data-id="${t.id}" aria-pressed="${pressed(Boolean(t.done))}" ${open ? "" : "disabled"}
    aria-label="${t.done ? "Done" : "Mark done"}: ${t.name}">${t.done ? icon("check") : ""}</button>`;
}

// ---------- today ----------
// The timer strip under a task: countdown, then pause/resume and stop; when it runs out, done or a bit longer.
function timerStrip(w, t) {
  const tm = timerFor(w, t.id), now = Date.now();
  if (!tm || t.done) return "";
  if (isUp(tm, now)) {
    return html`<div class="wtimer up" role="status">${icon("alarm")}<b class="max">Time's up</b>
      <button class="small" data-act="wTimerDone" data-id="${t.id}">${icon("check")}<span>Done</span></button>
      <button class="border small" data-act="wTimerMore">${icon("add")}<span>10 min</span></button>
      <button class="transparent small" data-act="wTimerStop" aria-label="Stop timer">${icon("stop")}</button></div>`;
  }
  const running = isRunning(tm);
  return html`<div class="wtimer${running ? " on" : ""}">${icon("timer")}
    <b class="max count" data-countdown="${tm.end || ""}" aria-label="Time left">${countdownText(msLeft(tm, now))}</b>
    ${running ? html`<button class="border small" data-act="wTimerPause">${icon("pause")}<span>Pause</span></button>`
      : html`<button class="border small" data-act="wTimerStart" data-id="${t.id}">${icon("play_arrow")}<span>Resume</span></button>`}
    <button class="transparent small" data-act="wTimerStop" aria-label="Stop timer">${icon("stop")}</button></div>`;
}

function todayRow(w, t, key, pinned) {
  const g = goalOf(w, t.goal), m = msOf(w, t.ms), tm = timerFor(w, t.id);
  return html`<li class="tagged ${goalTheme(w, t.goal)}${t.done ? " done" : ""}${tm ? " timing" : ""}">${check(t)}
    <div class="max"><div class="rname">${t.at ? html`<span class="wat">${startAt(t)}</span> ` : ""}${t.name}</div>
      <div class="small-text">${meta([[g?.name, m?.name].filter(Boolean).join(" › "), timeText(t)], t, key)}</div></div>
    ${t.done || tm ? "" : html`<button class="circle transparent" data-act="wTimerStart" data-id="${t.id}" aria-label="Start a ${minutesLeft(t)}-minute timer: ${t.name}" title="Timer (${durationText(minutesLeft(t))})">${icon("play_arrow")}</button>`}
    ${t.done ? "" : html`<button class="circle transparent${pinned ? " on" : ""}" data-act="wPin" data-id="${t.id}" aria-pressed="${pressed(pinned)}" aria-label="${pinned ? "Unpin" : "Pin to today"}: ${t.name}" title="Pin">${icon("pin")}</button>
      ${pinned ? "" : html`<button class="circle transparent" data-act="wSwap" data-id="${t.id}" aria-label="Swap out: ${t.name}" title="Not today">${icon("swap")}</button>`}`}
    ${timerStrip(w, t)}</li>`;
}

export function workTodayView() {
  const w = workData(), key = state.date;
  if (!w.goals.length) {
    return html`<article class="round padding"><h5>Start with one big goal</h5>
      <p>Add a goal with a deadline, break it into monthly milestones, then into small tasks. Each day this page picks a few tasks for you, most urgent first, so there's nothing to decide.</p>
      <nav><button data-act="wNew" data-kind="goal">${icon("add")}<span>Add a goal</span></button></nav></article>`;
  }
  const g = pageGoal(w);
  if (g) return goalPage(w, g, key);
  const t = todayState(w, key), picks = todayPicks(w, key), pins = t.pins || [];
  const done = picks.filter((x) => x.done).length, all = picks.length && done === picks.length;
  const open = w.tasks.filter((x) => !x.done), blocked = open.filter((x) => blocker(x, w.tasks)).length;
  return html`<article class="round no-padding ritual themed ember">
      <nav class="padding">${icon("target")}<div class="max"><h6>${longDate(key)}</h6><div class="small-text">${done} of ${picks.length} done</div></div>
        ${all ? html`<span class="chip fill">${icon("done_all")}Done</span>` : ""}</nav>
      <progress value="${picks.length ? Math.round((100 * done) / picks.length) : 0}" max="100"></progress>
      ${picks.length ? html`<ul class="list">${picks.map((x) => todayRow(w, x, key, pins.includes(x.id)))}</ul>`
        : html`<p class="padding small-text">Nothing open right now${blocked ? ` (${blocked} waiting on other tasks)` : ""}. Add tasks under Goals.</p>`}
      ${all && open.length > blocked ? html`<nav class="padding"><span class="max">Nice work. That's today handled.</span><button class="border" data-act="wMore">${icon("add")}<span>One more</span></button></nav>` : ""}
    </article>
    <nav class="wrap tasksday"><span class="small-text">Tasks a day:</span>${[3, 4, 5].map((n) => html`<button class="chip ${n === w.perDay ? "fill" : "border"}" data-act="wPerDay" data-n="${n}" aria-pressed="${pressed(n === w.perDay)}">${n}</button>`)}</nav>
    <p class="small-text workhint">Picked for you: overdue first, then whatever's due soonest. Unfinished tasks carry over. ${icon("pin")} keeps a task on today's list; ${icon("swap")} swaps it for the next one. Tasks waiting on another task stay hidden until that one's done. Tasks with a start time go to the top. ${icon("play_arrow")} starts a timer for what's left of the estimate (25 minutes if there isn't one).</p>
    <h3 class="gsection">Goals</h3>
    ${goalRows(w, key)}`;
}

// ---------- goals ----------
function status(p, due, key) {
  if (p.total && p.done === p.total) return html`<span class="badge on">${icon("check")} Complete</span>`;
  if (due && due < key) return html`<span class="badge bad">Past deadline</span>`;
  if (p.overdue) return html`<span class="badge bad">Behind · ${p.overdue} overdue</span>`;
  return html`<span class="badge good">On track</span>`;
}

function taskRow(w, t, key) {
  const b = blocker(t, w.tasks), tm = timerFor(w, t.id);
  return html`<li class="${t.done ? "done" : ""}${tm ? " timing" : ""}">${b ? html`<span class="circle lockd" title="Waiting on: ${b.name}">${icon("lock")}</span>` : check(t)}
    <div class="max"><div class="rname">${t.name}</div>
      <div class="small-text">${meta([startAt(t), timeText(t)], t, key)}${b ? ` · after “${b.name}”` : ""}${t.done ? ` · done ${shortDate(t.done)}` : ""}</div></div>
    ${t.done || b || tm ? "" : html`<button class="circle transparent" data-act="wTimerStart" data-id="${t.id}" aria-label="Start a ${minutesLeft(t)}-minute timer: ${t.name}" title="Timer (${durationText(minutesLeft(t))})">${icon("play_arrow")}</button>`}
    <button class="circle transparent" data-act="wEdit" data-kind="task" data-id="${t.id}" aria-label="Edit ${t.name}">${icon("edit")}</button>
    ${timerStrip(w, t)}</li>`;
}

// A goal's milestones; tasks without a milestone go under "Other".
function sectionsFor(w, g) {
  const tasks = w.tasks.filter((t) => t.goal === g.id);
  const ms = w.milestones.filter((m) => m.goal === g.id).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  const out = ms.map((m) => ({ id: m.id, m, name: m.name, icon: msIcon(m), tasks: tasks.filter((t) => t.ms === m.id) }));
  const loose = tasks.filter((t) => !t.ms || !ms.some((m) => m.id === t.ms));
  if (loose.length) out.push({ id: "_", m: null, name: "Other", icon: "list", tasks: loose });
  return out;
}

// Milestones as coloured bars. Tapping one opens its tasks: a strip with its icon, then a card with the list.
function milestoneBars(w, g, key) {
  const secs = sectionsFor(w, g), pick = state.openMs?.[g.id];
  if (!secs.length) return html`<p class="small-text mhint">No milestones or tasks yet.</p>`;
  return html`<div class="mbars">${secs.map((x, n) => {
    const on = secs.length === 1 || x.id === pick, p = progress(x.tasks, key), m = x.m;
    const late = x.tasks.some((t) => !t.done && t.due && t.due < key);
    const tasks = [...x.tasks].sort((a, b) => Boolean(a.done) - Boolean(b.done) || (a.due || "9999").localeCompare(b.due || "9999"));
    return html`<div class="mbar ink ${milestoneTheme(w, g.id, n)}${on ? " on" : ""}">
      <button class="mhead" data-act="wMs" data-goal="${g.id}" data-ms="${x.id}" aria-expanded="${on ? "true" : "false"}">
        <span class="mbi">${icon(x.icon)}</span><b class="max">${x.name}</b>
        <small>${late ? html`<i class="late" title="Something's overdue"></i>` : ""}${p.done}/${p.total}</small>${icon(on ? "expand_less" : "expand_more")}</button>
      ${on ? html`<div class="mopen"><div class="mstrip" aria-hidden="true">${icon(x.icon)}</div><div class="mcard">
        <div class="mmeta small-text"><span class="max">${m?.due ? `${shortDate(m.due)} · ${countdown(m.due, key)} · ` : ""}${p.done}/${p.total} done${p.spent ? ` · ${durationText(p.spent)} spent` : ""}
          ${m && p.total ? html` ${status(p, m.due, key)}` : ""}</span>
          ${m ? html`<button class="circle transparent" data-act="wEdit" data-kind="ms" data-id="${m.id}" aria-label="Edit ${m.name}">${icon("edit")}</button>` : ""}</div>
        ${tasks.length ? html`<ul class="list">${tasks.map((t) => taskRow(w, t, key))}</ul>` : ""}
        <button class="transparent addtask" data-act="wNew" data-kind="task" data-goal="${g.id}" data-ms="${m?.id || ""}">${icon("add")}<span>Add task</span></button>
      </div></div>` : ""}</div>`;
  })}</div>`;
}

const goalButtons = (g) => html`<nav class="wrap gbtns"><button class="border small" data-act="wNew" data-kind="ms" data-goal="${g.id}">${icon("flag")}<span>Milestone</span></button>
  <button class="border small" data-act="wNew" data-kind="task" data-goal="${g.id}">${icon("add")}<span>Task</span></button>
  <button class="border small" data-act="wEdit" data-kind="goal" data-id="${g.id}">${icon("edit")}<span>Edit goal</span></button></nav>`;

// Tapping a goal either opens its own page or opens it in place (switch on the Goals tab).
export const openMode = () => (getPref("workOpen") === "inplace" ? "inplace" : "page");

function pbar(p) {
  return html`<div class="pbar"><span class="ptrack" role="progressbar" aria-label="${p.done} of ${p.total} tasks done" aria-valuenow="${p.pct}" aria-valuemax="100"><i style="width:${p.pct}%"></i></span><span>${p.pct}%</span></div>`;
}

// The list: one pastel row per goal.
function goalRows(w, key) {
  const mode = openMode();
  return html`<div class="prows">${w.goals.map((g) => {
    const p = progress(w.tasks.filter((t) => t.goal === g.id), key);
    const open = mode === "inplace" && state.openGoals?.includes(g.id);
    const when = g.due ? countdown(g.due, key) : "Ongoing";
    return html`<article class="prow ink ${goalTheme(w, g.id)}${open ? " open" : ""}">
      <div class="phead" data-act="wOpen" data-id="${g.id}">
        <span class="pico" aria-hidden="true">${icon(goalIcon(g))}</span>
        <div class="max"><h3 class="pname">${g.name}</h3>
          <div class="pmeta">${p.done}/${p.total} · ${when}${p.overdue ? html` · <b class="pbad">${p.overdue} overdue</b>` : ""}</div>
          ${pbar(p)}</div>
        <button class="pchev" data-act="wOpen" data-id="${g.id}" ${mode === "inplace" ? html`aria-expanded="${open ? "true" : "false"}"` : ""} aria-label="${mode === "page" ? "Open" : open ? "Close" : "Open"} ${g.name}">
          ${icon(mode === "page" ? "chevron_right" : open ? "expand_less" : "expand_more")}</button></div>
      ${open ? html`<div class="pbody">${milestoneBars(w, g, key)}${goalButtons(g)}</div>` : ""}
    </article>`;
  })}</div>`;
}

// A goal's own page: big icon, name, deadline and progress, then its milestones.
function goalPage(w, g, key) {
  const p = progress(w.tasks.filter((t) => t.goal === g.id), key);
  const extra = [p.hoursLeft ? `${p.hoursLeft}h left` : "", p.spent ? `${durationText(p.spent)} spent` : ""].filter(Boolean).join(" · ");
  return html`<section class="gpage ${goalTheme(w, g.id)}">
    <nav class="gpnav"><button class="transparent" data-act="wClose">${icon("arrow_back")}<span>All goals</span></button></nav>
    <div class="gptop"><h2 class="gptitle">${g.name}</h2><span class="gsun" aria-hidden="true">${icon(goalIcon(g))}</span></div>
    <div class="gpmeta">${g.due ? `${shortDate(g.due)} · ${countdown(g.due, key)}` : "Ongoing"} ${p.total ? status(p, g.due, key) : ""}</div>
    <div class="gpprog">${pbar(p)}<div class="gprow"><span>${p.done}/${p.total} tasks</span>${extra ? html`<span>${extra}</span>` : ""}</div></div>
    ${milestoneBars(w, g, key)}
    ${goalButtons(g)}
  </section>`;
}

const pageGoal = (w) => (openMode() === "page" && state.goalPage ? w.goals.find((g) => g.id === state.goalPage) : null);

const KIND = { goal: "goal", ms: "milestone", task: "task" };

function workForm(w) {
  const e = state.editWork;
  if (!e) return html`<nav class="wrap addgoal"><button data-act="wNew" data-kind="goal">${icon("add")}<span>Add a goal</span></button></nav>`;
  const goalTasks = w.tasks.filter((t) => t.goal === e.goal && t.id !== e.id);
  const goalMs = w.milestones.filter((m) => m.goal === e.goal);
  return html`<article class="border round padding" id="wform"><h6>${e.id ? "Edit" : "New"} ${KIND[e.kind]}</h6>
    <div class="grid">
      <div class="s12 m8">${field("Name", html`<input placeholder=" " id="w-name" maxlength="120" value="${e.name || ""}">`)}</div>
      <div class="s6 m4">${field(e.kind === "task" ? "Due" : "Deadline", html`<input id="w-due" type="date" value="${e.due || ""}">`)}</div>
      ${e.kind !== "task" ? html`
        <div class="s12 m4">${field("Icon", html`<select id="w-icon"><option value="">Automatic (${MS_ICONS.find(([k]) => k === (e.kind === "goal" ? goalIcon : msIcon)({ name: e.name }))?.[1] || "Target"})</option>
          ${MS_ICONS.map(([k, label]) => html`<option value="${k}" ${k === e.icon ? "selected" : ""}>${label}</option>`)}</select>`)}</div>` : ""}
      ${e.kind === "task" ? html`
        <div class="s6 m4">${field("Start time (optional)", html`<input id="w-at" type="time" value="${e.at || ""}">`)}</div>
        <div class="s6 m4">${field("Time estimate (hours)", html`<input id="w-hours" type="number" min="0" max="200" step="0.25" value="${e.hours || ""}">`)}</div>
        <div class="s12 m4">${field("Milestone", html`<select id="w-ms"><option value="">None</option>${goalMs.map((m) => html`<option value="${m.id}" ${m.id === e.ms ? "selected" : ""}>${m.name}</option>`)}</select>`)}</div>
        <div class="s12 m4">${field("Can't start until", html`<select id="w-after"><option value="">Nothing, start any time</option>${goalTasks.map((t) => html`<option value="${t.id}" ${t.id === e.after ? "selected" : ""}>${t.name}</option>`)}</select>`)}</div>` : ""}
    </div>
    <nav class="wrap"><button data-act="wSave">Save</button><button class="transparent" data-act="wCancel">Cancel</button>
      ${e.id ? html`<button class="transparent error-text" data-act="wRemove">Delete</button>` : ""}</nav></article>`;
}

export function readWorkForm(view) {
  const e = state.editWork;
  if (!e) return;
  const val = (id) => view.querySelector(id)?.value;
  const name = val("#w-name"); if (name !== undefined) e.name = name.trim();
  const due = val("#w-due"); if (due !== undefined) e.due = due;
  const at = val("#w-at"); if (at !== undefined) e.at = at;
  const ic = val("#w-icon"); if (ic !== undefined) e.icon = ic;
  const hours = val("#w-hours"); if (hours !== undefined) e.hours = hours === "" ? "" : Math.max(0, Number(hours));
  const ms = val("#w-ms"); if (ms !== undefined) e.ms = ms;
  const after = val("#w-after"); if (after !== undefined) e.after = after;
}

function importBox(open) {
  const msg = state.workImport;
  return html`<details class="importbox"${open || msg ? " open" : ""}><summary>${icon("playlist_add")} Paste a plan from Claude</summary>
    <ol class="small-text">
      <li>Copy this prompt, paste it into Claude, and add your plan (or ask Claude to write one).</li>
      <li>Paste Claude's answer below and tap Import. You can edit everything afterwards.</li></ol>
    <p><button class="border small" data-act="wCopyPrompt">${icon("check")}<span>Copy the prompt</span></button></p>
    <label class="field"><span>Claude's answer</span><textarea id="w-import" rows="8" placeholder="GOAL: Book marketing launch | due 2027-09-30&#10;## Build email list | due 2026-10-31&#10;- Set up Substack welcome email | due 2026-10-05 | 2h"></textarea></label>
    <nav><button data-act="wImport">Import</button></nav>
    ${msg ? html`<p class="small-text importmsg">${msg}</p>` : ""}</details>`;
}

export function workGoalsView() {
  const w = workData(), key = state.date, g = pageGoal(w);
  if (g) return html`${workForm(w)}${goalPage(w, g, key)}<p class="small-text">${saveStatus()}</p>`;
  const mode = openMode();
  return html`${workForm(w)}${importBox(!w.goals.length)}${goalRows(w, key)}
    <nav class="wrap openmode"><span class="small-text">Tapping a goal:</span>${[["page", "Opens its own page"], ["inplace", "Opens in place"]].map(([k, label]) =>
      html`<button class="chip ${k === mode ? "fill" : "border"}" data-act="wMode" data-mode="${k}" aria-pressed="${pressed(k === mode)}">${label}</button>`)}</nav>
    <p class="small-text">Private to you. A lock means a task is waiting on another one. Behind = at least one task past its due date. ${saveStatus()}</p>`;
}
