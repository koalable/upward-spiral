// Work: Today (a few tasks, picked for you) and Goals (goal → milestones → tasks, with progress).
import { html, shortDate, longDate, clock, atTime } from "../util.js";
import { state, sheet } from "../state.js";
import { normalizeWork, todayState, todayPicks, blocker, progress, countdown, goalTheme, milestoneTheme, msIcon, goalIcon, MS_ICONS, saturation, staleTasks, PUSH_WHYS, ARCHIVE_WHYS } from "../work.js";
import { timerFor, isRunning, isUp, msLeft, minutesLeft, countdownText, durationText } from "../timer.js";
import { pressed, saveStatus, icon } from "./components.js";
import { pausedIds } from "../breathing.js";
import { read } from "../docs.js";

export const workData = () => read("work");
// Goals on a breathing-room pause this week: their tasks sit out of today's list.
export const pausedGoals = (key = state.date) => pausedIds(state.settings, "goal", key);
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
    <div class="max"><button class="tname rname" data-act="wTask" data-id="${t.id}">${t.at ? html`<span class="wat">${startAt(t)}</span> ` : ""}${t.name}</button>
      <div class="small-text">${meta([[g?.name, m?.name].filter(Boolean).join(" › "), timeText(t)], t, key)}</div></div>
    ${t.done || tm ? "" : html`<button class="circle transparent" data-act="wTimerStart" data-id="${t.id}" aria-label="Start a ${minutesLeft(t)}-minute timer: ${t.name}" title="Timer (${durationText(minutesLeft(t))})">${icon("play_arrow")}</button>`}
    ${t.done ? "" : html`<button class="circle transparent${pinned ? " on" : ""}" data-act="wPin" data-id="${t.id}" aria-pressed="${pressed(pinned)}" aria-label="${pinned ? "Unpin" : "Pin to today"}: ${t.name}" title="Pin">${icon("pin")}</button>
      ${pinned ? "" : html`<button class="circle transparent" data-act="wSwap" data-id="${t.id}" aria-label="Swap out: ${t.name}" title="Not today">${icon("swap")}</button>`}`}
    ${timerStrip(w, t)}</li>`;
}

// Tidy up: one task at a time that's over a week late. Push it back, archive it, or say it's done, and why.
function tidyCard(w, key) {
  const stale = staleTasks(w, key);
  if (!stale.length) return "";
  const t = stale[0], d = sheet("tidy")?.id === t.id ? state.sheet : { id: t.id };
  const g = goalOf(w, t.goal), m = msOf(w, t.ms), late = Math.round((new Date(`${key}T12:00:00`) - new Date(`${t.due}T12:00:00`)) / 86400000);
  const whys = d.action === "pushed" ? PUSH_WHYS : d.action === "archived" ? ARCHIVE_WHYS : [];
  const plus = (n) => { const x = new Date(`${key}T12:00:00`); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  const ready = d.action === "done" || (d.why && (d.action !== "pushed" || d.to));
  return html`<section class="panel tidy ink ${goalTheme(w, t.goal)} satbg" style="--sat:.55">
    <div class="tidyhead">${icon("alarm")}<span class="max">Tidy up · ${stale.length} task${stale.length === 1 ? "" : "s"} over a week late</span></div>
    <h3 class="tidyname">${t.name}</h3>
    <div class="small-text">${[g?.name, m?.name].filter(Boolean).join(" › ")} · due ${shortDate(t.due)}, ${late} days ago${t.pushes ? ` · pushed back ${t.pushes}×` : ""}</div>
    <div class="tidyacts">${[["pushed", "calendar", "Push back"], ["archived", "folder", "Archive"], ["done", "check", "Already done"]].map(([a, ic, label]) =>
      html`<button class="chip ${d.action === a ? "fill" : "border"}" data-act="tidyAction" data-id="${t.id}" data-action="${a}" aria-pressed="${pressed(d.action === a)}">${icon(ic)}${label}</button>`)}</div>
    ${d.action === "pushed" ? html`<div class="tidystep"><span class="tlabel">New due date</span><div class="tidyacts">
      ${[[7, "+1 week"], [14, "+2 weeks"]].map(([n, label]) => html`<button class="chip ${d.to === plus(n) ? "fill" : "border"}" data-act="tidyTo" data-to="${plus(n)}">${label}</button>`)}
      <input class="field tidydate" type="date" data-draft="to" data-redraw min="${key}" value="${d.to || ""}" aria-label="Pick a date"></div></div>` : ""}
    ${whys.length ? html`<div class="tidystep"><span class="tlabel">Why?</span><div class="tidyacts">${whys.map(([id, label]) =>
      html`<button class="chip ${d.why === id ? "fill" : "border"}" data-act="tidyWhy" data-why="${id}" aria-pressed="${pressed(d.why === id)}">${label}</button>`)}</div>
      <input class="field" data-draft="note" maxlength="200" placeholder="A note for later (optional)" value="${d.note || ""}" aria-label="Note"></div>` : ""}
    ${d.action ? html`<nav class="wrap tidysave"><button data-act="tidySave" ${ready ? "" : "disabled"}>Save${stale.length > 1 ? " and next" : ""}</button>
      <button class="transparent" data-act="tidyCancel">Cancel</button></nav>` : ""}
  </section>`;
}

export function workTodayView() {
  const w = workData(), key = state.date;
  if (!w.goals.length) {
    return html`<article class="round padding"><h5>Start with one big goal</h5>
      <p>Add a goal with a deadline, break it into monthly milestones, then into small tasks. Each day this page picks a few tasks for you, most urgent first, so there's nothing to decide.</p>
      <nav><button data-act="wNew" data-kind="goal">${icon("add")}<span>Add a goal</span></button></nav></article>`;
  }
  const g = pageGoal(w);
  if (g) return html`${goalPage(w, g, key)}${taskSheet(w, key)}`;
  const tidy = tidyCard(w, key);
  const t = todayState(w, key), picks = todayPicks(w, key, pausedGoals(key)), pins = t.pins || [];
  const done = picks.filter((x) => x.done).length, all = picks.length && done === picks.length;
  const open = w.tasks.filter((x) => !x.done), blocked = open.filter((x) => blocker(x, w.tasks)).length;
  return html`${tidy}<article class="round no-padding ritual themed ember">
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
    ${goalDeck(w, key)}${taskSheet(w, key)}`;
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
    <div class="max"><button class="tname rname" data-act="wTask" data-id="${t.id}">${t.name}</button>
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

// Milestones as folder tabs. The picked tab's card comes to the front with that milestone's tasks.
function milestoneTabs(w, g, key) {
  const secs = sectionsFor(w, g);
  if (!secs.length) return html`<p class="small-text mhint">No milestones or tasks yet.</p>`;
  const themed = secs.map((x, n) => ({ ...x, theme: milestoneTheme(w, g.id, n) }));
  const firstOpen = themed.find((x) => x.tasks.some((t) => !t.done)) || themed[0];
  const x = themed.find((y) => y.id === state.route.ms) || firstOpen;
  const p = progress(x.tasks, key), m = x.m;
  const tasks = [...x.tasks].sort((a, b) => Boolean(a.done) - Boolean(b.done) || (a.due || "9999").localeCompare(b.due || "9999"));
  return html`<div class="folder">
    <div class="ftabs" role="group" aria-label="Milestones">${themed.map((y) => {
      const on = y === x, d = y.tasks.filter((t) => t.done).length, late = y.tasks.some((t) => !t.done && t.due && t.due < key);
      return html`<button class="ftab ink satbg ${y.theme}${on ? " on" : ""}" style="--sat:${saturation(progress(y.tasks, key).pct)}" aria-pressed="${on ? "true" : "false"}" data-act="wMs" data-goal="${g.id}" data-ms="${y.id}">
        ${icon(y.icon)}<span>${y.name}</span><small>${late ? html`<i class="late" title="Something's overdue"></i>` : ""}${d}/${y.tasks.length}</small></button>`;
    })}</div>
    <div class="fcard ink satbg ${x.theme}" style="--sat:${saturation(p.pct)}" role="region" aria-label="${x.name}">
      <div class="fhead"><span class="fico" aria-hidden="true">${icon(x.icon)}</span>
        <div class="max"><h3>${x.name}</h3>
          <div class="small-text">${m?.due ? `${shortDate(m.due)} · ${countdown(m.due, key)} · ` : ""}${p.done}/${p.total} done${p.spent ? ` · ${durationText(p.spent)} spent` : ""}</div>
          ${m && p.total ? html`<div class="stat">${status(p, m.due, key)}</div>` : ""}</div>
        ${m ? html`<button class="circle transparent" data-act="wEdit" data-kind="ms" data-id="${m.id}" aria-label="Edit ${m.name}">${icon("edit")}</button>` : ""}</div>
      <div class="mcard plain">
        ${tasks.length ? html`<ul class="list">${tasks.map((t) => taskRow(w, t, key))}</ul>` : ""}
        <button class="transparent addtask" data-act="wNew" data-kind="task" data-goal="${g.id}" data-ms="${m?.id || ""}">${icon("add")}<span>Add task</span></button>
      </div></div></div>`;
}

const goalButtons = (g) => html`<nav class="wrap gbtns"><button class="border small" data-act="wNew" data-kind="ms" data-goal="${g.id}">${icon("flag")}<span>Milestone</span></button>
  <button class="border small" data-act="wNew" data-kind="task" data-goal="${g.id}">${icon("add")}<span>Task</span></button>
  <button class="border small" data-act="wEdit" data-kind="goal" data-id="${g.id}">${icon("edit")}<span>Edit goal</span></button></nav>`;

function pbar(p) {
  return html`<div class="pbar"><span class="ptrack" role="progressbar" aria-label="${p.done} of ${p.total} tasks done" aria-valuenow="${p.pct}" aria-valuemax="100"><i style="width:${p.pct}%"></i></span><span>${p.pct}%</span></div>`;
}

// All goals: a stacked deck. Each card peeks out; tap one to open its page.
function goalDeck(w, key) {
  return html`<div class="deck">${w.goals.map((g) => {
    const p = progress(w.tasks.filter((t) => t.goal === g.id), key);
    const when = g.due ? countdown(g.due, key) : "Ongoing";
    return html`<article class="dcard ink satbg ${goalTheme(w, g.id)}" style="--sat:${saturation(p.pct)}">
      <div class="phead" data-act="wOpen" data-id="${g.id}">
        <span class="pico" aria-hidden="true">${icon(goalIcon(g))}</span>
        <div class="max"><h3 class="pname">${g.name}</h3>
          <div class="pmeta">${p.done}/${p.total} · ${when}${p.overdue ? html` · <b class="pbad">${p.overdue} overdue</b>` : ""}</div>
          ${pbar(p)}</div>
        <button class="pchev" data-act="wOpen" data-id="${g.id}" aria-label="Open ${g.name}">${icon("chevron_right")}</button></div>
    </article>`;
  })}</div>`;
}

// A goal's own page: big name and icon, deadline and progress, then its milestones as folder tabs.
function goalPage(w, g, key) {
  const p = progress(w.tasks.filter((t) => t.goal === g.id), key);
  const extra = [p.hoursLeft ? `${p.hoursLeft}h left` : "", p.spent ? `${durationText(p.spent)} spent` : ""].filter(Boolean).join(" · ");
  return html`<section class="gpage ${goalTheme(w, g.id)}">
    <nav class="gpnav"><button class="transparent" data-act="wClose">${icon("arrow_back")}<span>All goals</span></button></nav>
    <div class="gptop"><h2 class="gptitle">${g.name}</h2><span class="gsun satbg" style="--sat:${saturation(p.pct)}" aria-hidden="true">${icon(goalIcon(g))}</span></div>
    <div class="gpmeta">${g.due ? `${shortDate(g.due)} · ${countdown(g.due, key)}` : "Ongoing"} ${p.total ? status(p, g.due, key) : ""}</div>
    <div class="gpprog">${pbar(p)}<div class="gprow"><span>${p.done}/${p.total} tasks</span>${extra ? html`<span>${extra}</span>` : ""}</div></div>
    ${milestoneTabs(w, g, key)}
    ${goalButtons(g)}
  </section>`;
}

const pageGoal = (w) => (state.route.goal ? w.goals.find((g) => g.id === state.route.goal) : null);

// One task, on a card that slides up: when, time, timer, what it waits on, and actions.
function taskSheet(w, key) {
  const t = sheet("task") && w.tasks.find((x) => x.id === state.sheet.id);
  if (!t) return "";
  const g = goalOf(w, t.goal), m = msOf(w, t.ms), b = blocker(t, w.tasks), tm = timerFor(w, t.id);
  const next = w.tasks.filter((x) => x.after === t.id && !x.done);
  const est = (Number(t.hours) || 0) * 60, spent = Number(t.spent) || 0;
  const when = [t.at ? html`<span class="tpill">${icon("timer")}${startAt(t)}</span>` : "", t.due ? html`<span class="tpill">${icon("event")}${dueLabel(t, key)}</span>` : ""];
  return html`<div class="sheetbg" data-act="wTaskClose"></div>
  <section class="tsheet ink satbg ${m ? milestoneTheme(w, t.goal, sectionsFor(w, g || {}).findIndex((x) => x.id === t.ms)) : goalTheme(w, t.goal)}" style="--sat:${saturation(progress(w.tasks.filter((x) => (m ? x.ms === m.id : x.goal === t.goal)), key).pct)}" role="dialog" aria-modal="true" aria-label="${t.name}">
    <div class="tgrip" aria-hidden="true"></div>
    <nav class="ttop"><span class="tpath small-text max">${[g?.name, m?.name].filter(Boolean).join(" › ")}</span>
      <button class="circle transparent" data-act="wTaskClose" aria-label="Close">${icon("close")}</button></nav>
    <h2 class="tbig${t.done ? " done" : ""}">${t.name}</h2>
    ${when.some(Boolean) ? html`<div class="tpills">${when}</div>` : ""}
    <div class="tblock plain"><div class="tlabel">Time</div>
      <div class="ttime"><b>${spent ? durationText(spent) : "0m"}</b><span>${est ? `of ${durationText(est)} estimated` : "spent (no estimate)"}</span></div>
      ${est ? html`<span class="ptrack"><i style="width:${Math.min(100, Math.round((100 * spent) / est))}%"></i></span>` : ""}
      ${t.done || b ? "" : tm ? timerStrip(w, t)
        : html`<button class="tstart" data-act="wTimerStart" data-id="${t.id}">${icon("play_arrow")}<span>Start a ${durationText(minutesLeft(t))} timer</span></button>`}</div>
    ${b || next.length ? html`<div class="tblock plain"><div class="tlabel">Order</div>
      ${b ? html`<p>${icon("lock")} Waiting on <b>${b.name}</b></p>` : ""}
      ${next.length ? html`<p>${icon("arrow_downward")} Unlocks ${next.map((x) => x.name).join(", ")}</p>` : ""}</div>` : ""}
    <nav class="wrap tacts">${b ? "" : html`<button data-act="wToggle" data-id="${t.id}">${icon(t.done ? "close" : "check")}<span>${t.done ? "Not done" : "Mark done"}</span></button>`}
      <button class="border" data-act="wEdit" data-kind="task" data-id="${t.id}">${icon("edit")}<span>Edit</span></button>
      <button class="transparent error-text" data-act="wTaskDelete" data-id="${t.id}">${icon("delete")}<span>Delete</span></button></nav>
  </section>`;
}


const KIND = { goal: "goal", ms: "milestone", task: "task" };

function workForm(w) {
  const e = sheet("work");
  if (!e) return html`<nav class="wrap addgoal"><button data-act="wNew" data-kind="goal">${icon("add")}<span>Add a goal</span></button></nav>`;
  const goalTasks = w.tasks.filter((t) => t.goal === e.goal && t.id !== e.id);
  const goalMs = w.milestones.filter((m) => m.goal === e.goal);
  return html`<article class="border round padding" id="wform"><h6>${e.id ? "Edit" : "New"} ${KIND[e.kind]}</h6>
    <div class="grid">
      <div class="s12 m8">${field("Name", html`<input placeholder=" " id="w-name" data-draft="name" maxlength="120" value="${e.name || ""}">`)}</div>
      <div class="s6 m4">${field(e.kind === "task" ? "Due" : "Deadline", html`<input id="w-due" data-draft="due" type="date" value="${e.due || ""}">`)}</div>
      ${e.kind !== "task" ? html`
        <div class="s12 m4">${field("Icon", html`<select id="w-icon" data-draft="icon"><option value="">Automatic (${MS_ICONS.find(([k]) => k === (e.kind === "goal" ? goalIcon : msIcon)({ name: e.name }))?.[1] || "Target"})</option>
          ${MS_ICONS.map(([k, label]) => html`<option value="${k}" ${k === e.icon ? "selected" : ""}>${label}</option>`)}</select>`)}</div>` : ""}
      ${e.kind === "task" ? html`
        <div class="s6 m4">${field("Start time (optional)", html`<input id="w-at" data-draft="at" type="time" value="${e.at || ""}">`)}</div>
        <div class="s6 m4">${field("Time estimate (hours)", html`<input id="w-hours" data-draft="hours" data-num type="number" min="0" max="200" step="0.25" value="${e.hours || ""}">`)}</div>
        <div class="s12 m4">${field("Milestone", html`<select id="w-ms" data-draft="ms"><option value="">None</option>${goalMs.map((m) => html`<option value="${m.id}" ${m.id === e.ms ? "selected" : ""}>${m.name}</option>`)}</select>`)}</div>
        <div class="s12 m4">${field("Can't start until", html`<select id="w-after" data-draft="after"><option value="">Nothing, start any time</option>${goalTasks.map((t) => html`<option value="${t.id}" ${t.id === e.after ? "selected" : ""}>${t.name}</option>`)}</select>`)}</div>` : ""}
    </div>
    <nav class="wrap"><button data-act="wSave">Save</button><button class="transparent" data-act="wCancel">Cancel</button>
      ${e.id ? html`<button class="transparent error-text" data-act="wRemove">Delete</button>` : ""}</nav></article>`;
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
  if (g) return html`${sheet("work") ? workForm(w) : ""}${goalPage(w, g, key)}${taskSheet(w, key)}<p class="small-text">${saveStatus()}</p>`;
  return html`${workForm(w)}${importBox(!w.goals.length)}${goalDeck(w, key)}${taskSheet(w, key)}
    <p class="small-text">Private to you. Tap a goal to open it, and a task for its details. A lock means a task is waiting on another one. ${saveStatus()}</p>`;
}
