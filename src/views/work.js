// Work: Today (a few tasks, picked for you) and Goals (goal → milestones → tasks, with progress).
import { html, shortDate, longDate, clock, atTime } from "../util.js";
import { state } from "../state.js";
import { normalizeWork, todayState, todayPicks, blocker, progress, countdown, goalTheme, msIcon, MS_ICONS } from "../work.js";
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
    ${goalCards(w, key, true)}`;
}

// ---------- goals ----------
function status(p, due, key) {
  if (p.total && p.done === p.total) return html`<span class="badge on">${icon("check")} Complete</span>`;
  if (due && due < key) return html`<span class="badge bad">Past deadline</span>`;
  if (p.overdue) return html`<span class="badge bad">Behind · ${p.overdue} overdue</span>`;
  return html`<span class="badge good">On track</span>`;
}

function bar(p) {
  return html`<progress value="${p.pct}" max="100" aria-label="${p.done} of ${p.total} tasks done"></progress>`;
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

// A goal's milestones as tiles; tasks without a milestone get an "Other" tile.
function tilesFor(w, g) {
  const tasks = w.tasks.filter((t) => t.goal === g.id);
  const ms = w.milestones.filter((m) => m.goal === g.id).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  const tiles = ms.map((m) => ({ id: m.id, m, name: m.name, icon: msIcon(m), tasks: tasks.filter((t) => t.ms === m.id) }));
  const loose = tasks.filter((t) => !t.ms || !ms.some((m) => m.id === t.ms));
  if (loose.length) tiles.push({ id: "_", m: null, name: "Other", icon: "list", tasks: loose });
  return tiles;
}

function tile(g, x, on, key) {
  const done = x.tasks.filter((t) => t.done).length, all = x.tasks.length && done === x.tasks.length;
  const late = x.tasks.some((t) => !t.done && t.due && t.due < key);
  return html`<button class="mtile${on ? " on" : ""}${all ? " all" : ""}" data-act="wMs" data-goal="${g.id}" data-ms="${x.id}" aria-expanded="${on ? "true" : "false"}"
    aria-label="${x.name}: ${done} of ${x.tasks.length} done${late ? ", something overdue" : ""}">
    <span class="mi">${icon(x.icon)}</span><span class="mrule"></span><b>${x.name}</b>
    <small>${all ? icon("check") : ""}${done} / ${x.tasks.length}${late ? html` <i class="late" aria-hidden="true"></i>` : ""}</small></button>`;
}

// The open milestone: its deadline and status, then its tasks.
function tilePanel(w, g, x, key) {
  const p = progress(x.tasks, key), m = x.m;
  const tasks = [...x.tasks].sort((a, b) => Boolean(a.done) - Boolean(b.done) || (a.due || "9999").localeCompare(b.due || "9999"));
  return html`<div class="mpanel">
    <nav class="padding"><div class="max"><b>${x.name}</b>
      <div class="small-text">${m?.due ? `${shortDate(m.due)} · ${countdown(m.due, key)} · ` : ""}${p.done}/${p.total} done${p.spent ? ` · ${durationText(p.spent)} spent` : ""}</div>
      ${m ? html`<div class="stat">${status(p, m.due, key)}</div>` : ""}</div>
      ${m ? html`<button class="circle transparent" data-act="wEdit" data-kind="ms" data-id="${m.id}" aria-label="Edit ${m.name}">${icon("edit")}</button>` : ""}</nav>
    ${tasks.length ? html`<ul class="list">${tasks.map((t) => taskRow(w, t, key))}</ul>` : html`<p class="padding small-text">No tasks yet.</p>`}
    <nav class="padding"><button class="border small" data-act="wNew" data-kind="task" data-goal="${g.id}" data-ms="${m?.id || ""}">${icon("add")}<span>Task</span></button></nav></div>`;
}

function stat(value, label) {
  return html`<div class="gstat"><b>${value}</b><small>${label}</small></div>`;
}

// Today: cards start closed; tap one to see its milestone tiles. Goals: tiles always showing, plus edit buttons.
function goalCards(w, key, compact) {
  return w.goals.map((g) => {
    const tasks = w.tasks.filter((t) => t.goal === g.id), p = progress(tasks, key);
    const open = !compact || state.openGoals?.includes(g.id);
    const tiles = tilesFor(w, g);
    const pick = state.openMs?.[g.id], sel = tiles.length === 1 ? tiles[0] : tiles.find((x) => x.id === pick);
    const extra = [p.hoursLeft ? `${p.hoursLeft}h left` : "", p.spent ? `${durationText(p.spent)} spent` : ""].filter(Boolean).join(" · ");
    return html`<article class="round no-padding goal ${goalTheme(w, g.id)}${compact ? " fold" : ""}${open ? " open" : ""}">
      <div class="gbody"${compact ? html` data-act="wOpen" data-id="${g.id}"` : ""}>
        <div class="gtop"><span class="gchip">${icon("target")}</span><span class="max"></span><span class="gpill">${status(p, g.due, key)}</span>
          ${compact ? html`<button class="circle transparent" data-act="wOpen" data-id="${g.id}" aria-expanded="${open ? "true" : "false"}" aria-label="${open ? "Hide" : "Show"} milestones: ${g.name}">${icon(open ? "expand_less" : "expand_more")}</button>`
            : html`<button class="circle transparent" data-act="wEdit" data-kind="goal" data-id="${g.id}" aria-label="Edit ${g.name}">${icon("edit")}</button>`}</div>
        <h3 class="gname">${g.name}</h3>
        <div class="gstats">${stat(g.due ? shortDate(g.due) : "—", g.due ? countdown(g.due, key) : "Due date")}${stat(`${p.pct}%`, "Progress")}${stat(`${p.done}/${p.total}`, "Tasks")}</div>
        ${extra ? html`<div class="gextra">${extra}</div>` : ""}
      </div>
      ${bar(p)}
      ${!open ? "" : html`
        ${tiles.length > 1 ? html`<div class="mtiles" role="group" aria-label="Milestones">${tiles.map((x) => tile(g, x, x === sel, key))}</div>` : ""}
        ${sel ? tilePanel(w, g, sel, key) : tiles.length ? html`<p class="padding small-text mhint">Tap a milestone to see its tasks.</p>` : html`<p class="padding small-text mhint">No tasks yet.</p>`}
        ${compact ? "" : html`<nav class="padding wrap"><button class="border small" data-act="wNew" data-kind="ms" data-goal="${g.id}">${icon("flag")}<span>Milestone</span></button>
          <button class="border small" data-act="wNew" data-kind="task" data-goal="${g.id}">${icon("add")}<span>Task</span></button></nav>`}`}
    </article>`;
  });
}

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
      ${e.kind === "ms" ? html`
        <div class="s12 m4">${field("Icon", html`<select id="w-icon"><option value="">Automatic (${MS_ICONS.find(([k]) => k === msIcon({ name: e.name }))?.[1] || "Milestone"})</option>
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
  const w = workData(), key = state.date;
  return html`${workForm(w)}${importBox(!w.goals.length)}${goalCards(w, key, false)}
    <p class="small-text">Private to you. A lock means a task is waiting on another one. Behind = at least one task past its due date. ${saveStatus()}</p>`;
}
