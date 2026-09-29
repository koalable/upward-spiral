// To-dos: one list, grouped by date. Each item may have a "do on" date (when you plan to do it)
// and a "due" date (deadline). Check-in → Today shows today's items plus the rest of this week.
import { read } from "../docs.js";
import { html, todayKey } from "../util.js";
import { state, sheet } from "../state.js";
import { normalizeTodos, buckets, dashboard, isOverdue, dayLabel } from "../todos.js";
import { icon } from "./components.js";

export const todoData = () => read("todos");

function chips(x, today) {
  const out = [];
  if (x.on && !x.done && x.on > today) out.push(html`<span class="tchipd">${icon("calendar")} ${dayLabel(x.on, today)}</span>`);
  if (x.due) out.push(html`<span class="tchipd due${isOverdue(x, today) ? " late" : x.due === today && !x.done ? " soon" : ""}">${icon("flag")} due ${dayLabel(x.due, today)}</span>`);
  return out;
}

function dateEditor(x) {
  return html`<div class="tdates" data-todo-editor="${x.id}">
    <label>Do on<input class="field" type="date" data-todo-on="${x.id}" value="${x.on || ""}"></label>
    <label>Due<input class="field" type="date" data-todo-due="${x.id}" value="${x.due || ""}"></label>
    <button class="linkbtn" data-act="todoDates" data-id="">Done</button></div>`;
}

export function todoRow(x, today) {
  const editing = sheet("todo")?.id === x.id;
  return html`<li class="todo${x.done ? " done" : ""}${isOverdue(x, today) ? " late" : ""}">
    <input type="checkbox" data-todo-done="${x.id}" ${x.done ? "checked" : ""} aria-label="Mark “${x.t}” done">
    <div class="tmain"><span class="ttext">${x.t}</span>${(x.on && x.on > today && !x.done) || x.due ? html`<div class="tmeta">${chips(x, today)}</div>` : ""}</div>
    <button class="linkbtn tdatebtn" data-act="todoDates" data-id="${editing ? "" : x.id}" aria-label="Dates for “${x.t}”">${icon("calendar-clock")}</button>
    <button class="x" data-act="todoRemove" data-id="${x.id}" aria-label="Remove “${x.t}”">×</button>
    ${editing ? dateEditor(x) : ""}</li>`;
}

// Add a to-do. "form" names the inputs so the dashboard and the tab can each have one.
export function addForm(form, { on = "", label = "Add a to-do" } = {}) {
  return html`<div class="tadd">
    <input class="field" id="${form}-t" placeholder="${label}" data-todo-input="${form}" aria-label="${label}">
    <div class="tadd-dates">
      <label>Do on<input class="field" type="date" id="${form}-on" value="${on}"></label>
      <label>Due<input class="field" type="date" id="${form}-due"></label>
      <button class="btn ghost" data-act="todoAdd" data-form="${form}">Add</button></div></div>`;
}

const list = (items, today, empty = "") => (items.length
  ? html`<ul class="goallist tlist">${items.map((x) => todoRow(x, today))}</ul>`
  : empty ? html`<p class="hint">${empty}</p>` : "");

export function todosView() {
  const today = todayKey(), b = buckets(todoData().items, today);
  const group = (title, items, empty) => html`<section class="panel"><h2>${title}${items.length ? html` <span class="pts">${items.filter((x) => !x.done).length}</span>` : ""}</h2>${list(items, today, empty)}</section>`;
  return html`<p class="hint">One-off tasks. Give one a <b>Do on</b> date to plan it for a day, a <b>Due</b> date for a deadline, both, or neither. Today's shows on Check-in → Today. For things you do again and again, add a habit instead. Private to you.</p>
    <section class="panel">${addForm("tnew")}</section>
    ${group("Today", b.today, "Nothing planned or due today.")}
    ${group("This week", b.week, "")}
    ${b.month.length ? group("Later this month", b.month) : ""}
    ${b.later.length ? group("Later", b.later) : ""}
    ${group("Someday", b.someday, "No-date to-dos land here.")}
    ${b.done.length ? html`<details class="panel tdone"><summary><h2>Done</h2></summary>${list(b.done.slice(0, 30), today)}</details>` : ""}`;
}

// Check-in dashboard card.
export function dashboardTodos() {
  const today = todayKey(), d = dashboard(todoData().items, today);
  const open = d.week.length;
  return html`<div class="plateblock"><h3 class="platehead">${icon("checklist")} To-dos</h3>
    ${list(d.today, today, "Nothing planned or due today.")}
    ${open ? html`<details class="tweek" ${d.week.some((x) => x.id === sheet("todo")?.id) ? "open" : ""}><summary>${open} more this week</summary>${list(d.week, today)}</details>` : ""}
    ${addForm("tdash", { on: today, label: "Add a to-do for today" })}</div>`;
}
