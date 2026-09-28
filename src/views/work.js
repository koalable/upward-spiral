// Work: Today (a few tasks, picked for you) and Goals (goal → milestones → tasks, with progress).
import { html, shortDate, longDate } from "../util.js";
import { state } from "../state.js";
import { normalizeWork, todayState, todayPicks, blocker, progress, countdown } from "../work.js";
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

function check(t, open = true) {
  return html`<button class="circle ${t.done ? "" : "border"}" data-act="wToggle" data-id="${t.id}" aria-pressed="${pressed(Boolean(t.done))}" ${open ? "" : "disabled"}
    aria-label="${t.done ? "Done" : "Mark done"}: ${t.name}">${t.done ? icon("check") : ""}</button>`;
}

// ---------- today ----------
function todayRow(w, t, key, pinned) {
  const g = goalOf(w, t.goal), m = msOf(w, t.ms);
  return html`<li class="${t.done ? "done" : ""}">${check(t)}
    <div class="max"><div class="rname">${t.name}</div>
      <div class="small-text">${[g?.name, m?.name].filter(Boolean).join(" › ")}${t.hours ? ` · ${t.hours}h` : ""}${t.due ? " · " : ""}${dueLabel(t, key)}</div></div>
    ${t.done ? "" : html`<button class="circle transparent${pinned ? " on" : ""}" data-act="wPin" data-id="${t.id}" aria-pressed="${pressed(pinned)}" aria-label="${pinned ? "Unpin" : "Pin to today"}: ${t.name}" title="Pin">${icon("pin")}</button>
      ${pinned ? "" : html`<button class="circle transparent" data-act="wSwap" data-id="${t.id}" aria-label="Swap out: ${t.name}" title="Not today">${icon("swap")}</button>`}`}</li>`;
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
  return html`<article class="round no-padding ritual">
      <nav class="padding">${icon("target")}<div class="max"><h6>${longDate(key)}</h6><div class="small-text">${done} of ${picks.length} done</div></div>
        ${all ? html`<span class="chip fill">${icon("done_all")}Done</span>` : ""}</nav>
      <progress value="${picks.length ? Math.round((100 * done) / picks.length) : 0}" max="100"></progress>
      ${picks.length ? html`<ul class="list">${picks.map((x) => todayRow(w, x, key, pins.includes(x.id)))}</ul>`
        : html`<p class="padding small-text">Nothing open right now${blocked ? ` (${blocked} waiting on other tasks)` : ""}. Add tasks under Goals.</p>`}
      ${all && open.length > blocked ? html`<nav class="padding"><span class="max">Nice work. That's today handled.</span><button class="border" data-act="wMore">${icon("add")}<span>One more</span></button></nav>` : ""}
    </article>
    <nav class="wrap"><span class="small-text">Tasks a day:</span>${[3, 4, 5].map((n) => html`<button class="chip ${n === w.perDay ? "fill" : "border"}" data-act="wPerDay" data-n="${n}" aria-pressed="${pressed(n === w.perDay)}">${n}</button>`)}</nav>
    <p class="small-text">Picked for you: overdue first, then whatever's due soonest. Unfinished tasks carry over. ${icon("pin")} keeps a task on today's list; ${icon("swap")} swaps it for the next one. Tasks waiting on another task stay hidden until that one's done.</p>
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
  const b = blocker(t, w.tasks);
  return html`<li class="${t.done ? "done" : ""}">${b ? html`<span class="circle lockd" title="Waiting on: ${b.name}">${icon("lock")}</span>` : check(t)}
    <div class="max"><div class="rname">${t.name}</div>
      <div class="small-text">${t.hours ? `${t.hours}h${t.due ? " · " : ""}` : ""}${dueLabel(t, key)}${b ? ` · after “${b.name}”` : ""}${t.done ? ` · done ${shortDate(t.done)}` : ""}</div></div>
    <button class="circle transparent" data-act="wEdit" data-kind="task" data-id="${t.id}" aria-label="Edit ${t.name}">${icon("edit")}</button></li>`;
}

function milestoneBlock(w, g, m, key) {
  const tasks = w.tasks.filter((t) => t.goal === g.id && (t.ms || "") === (m?.id || ""));
  if (!m && !tasks.length) return "";
  const p = progress(tasks, key);
  return html`<div class="ms">
    <nav class="padding">${icon("flag")}<div class="max"><b>${m ? m.name : "Other tasks"}</b>
      <div class="small-text">${m?.due ? `${shortDate(m.due)} · ${countdown(m.due, key)} · ` : ""}${p.done}/${p.total} done</div>
      ${m ? html`<div class="stat">${status(p, m.due, key)}</div>` : ""}</div>
      ${m ? html`<button class="circle transparent" data-act="wEdit" data-kind="ms" data-id="${m.id}" aria-label="Edit ${m.name}">${icon("edit")}</button>` : ""}</nav>
    ${tasks.length ? bar(p) : ""}
    ${tasks.length ? html`<ul class="list">${tasks.sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999")).map((t) => taskRow(w, t, key))}</ul>` : ""}
    ${m ? html`<nav class="padding"><button class="transparent small" data-act="wNew" data-kind="task" data-goal="${g.id}" data-ms="${m.id}">${icon("add")}<span>Task</span></button></nav>` : ""}</div>`;
}

function goalCards(w, key, compact) {
  return w.goals.map((g) => {
    const tasks = w.tasks.filter((t) => t.goal === g.id), p = progress(tasks, key);
    const ms = w.milestones.filter((m) => m.goal === g.id).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
    return html`<article class="round no-padding goal">
      <nav class="padding">${icon("target")}<div class="max"><h6>${g.name}</h6>
        <div class="small-text">${g.due ? `${shortDate(g.due)} · ${countdown(g.due, key)} · ` : ""}${p.pct}% · ${p.done}/${p.total} tasks${p.hoursLeft ? ` · ${p.hoursLeft}h left` : ""}</div>
        <div class="stat">${status(p, g.due, key)}</div></div>
        ${compact ? "" : html`<button class="circle transparent" data-act="wEdit" data-kind="goal" data-id="${g.id}" aria-label="Edit ${g.name}">${icon("edit")}</button>`}</nav>
      ${bar(p)}
      ${compact ? "" : html`${ms.map((m) => milestoneBlock(w, g, m, key))}${milestoneBlock(w, g, null, key)}
        <nav class="padding wrap"><button class="border small" data-act="wNew" data-kind="ms" data-goal="${g.id}">${icon("flag")}<span>Milestone</span></button>
          <button class="border small" data-act="wNew" data-kind="task" data-goal="${g.id}">${icon("add")}<span>Task</span></button></nav>`}
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
      ${e.kind === "task" ? html`
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
  const hours = val("#w-hours"); if (hours !== undefined) e.hours = hours === "" ? "" : Math.max(0, Number(hours));
  const ms = val("#w-ms"); if (ms !== undefined) e.ms = ms;
  const after = val("#w-after"); if (after !== undefined) e.after = after;
}

export function workGoalsView() {
  const w = workData(), key = state.date;
  return html`${workForm(w)}${goalCards(w, key, false)}
    <p class="small-text">Private to you. A lock means a task is waiting on another one. Behind = at least one task past its due date. ${saveStatus()}</p>`;
}
