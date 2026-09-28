// Check-in → Today as a daily dashboard: today's to-dos and today's Work tasks, above the check-in.
import { html, todayKey, shortDate } from "../util.js";
import { pageUrl } from "../page.js";
import { goalList } from "./todos.js";
import { workData } from "./work.js";
import { todayPicks, goalTheme } from "../work.js";
import { pressed, icon } from "./components.js";

function workCard() {
  const w = workData(), key = todayKey();
  const link = html`<a class="linkbtn" href="${pageUrl("work")}">Open Work →</a>`;
  if (!w.goals.length) return html`<section class="panel themed ember"><h2>Work today</h2><p class="hint">No work goals yet. ${link}</p></section>`;
  const picks = todayPicks(w, key), done = picks.filter((t) => t.done).length;
  const goal = (t) => w.goals.find((g) => g.id === t.goal)?.name || "";
  return html`<section class="panel themed ember"><div class="cat-head"><h2>Work today</h2><span class="pts">${done}/${picks.length}</span></div>
    ${picks.length ? html`<ul class="list dash">${picks.map((t) => html`<li class="tagged ${goalTheme(w, t.goal)}${t.done ? " done" : ""}">
      <button class="circle ${t.done ? "" : "border"}" data-act="wToggle" data-id="${t.id}" aria-pressed="${pressed(Boolean(t.done))}" aria-label="${t.done ? "Done" : "Mark done"}: ${t.name}">${t.done ? icon("check") : ""}</button>
      <div class="max"><div class="rname">${t.name}</div><div class="small-text">${goal(t)}${t.due ? ` · ${t.due < key && !t.done ? "overdue, " : "due "}${shortDate(t.due)}` : ""}</div></div></li>`)}</ul>`
      : html`<p class="hint">Nothing open right now.</p>`}
    <p class="small">${link}</p></section>`;
}

export function dashboardView() {
  return html`<div class="dashboard">${goalList("d" + todayKey(), "To-dos today")}${workCard()}</div>`;
}
