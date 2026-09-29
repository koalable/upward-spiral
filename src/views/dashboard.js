// Check-in → Today as a daily dashboard: today's to-dos and today's Work tasks, above the check-in.
import { html, todayKey, shortDate, clock, atTime } from "../util.js";
import { pageUrl } from "../page.js";
import { dashboardTodos } from "./todos.js";
import { todayPicks, goalTheme, staleTasks } from "../work.js";
import { read } from "../docs.js";
import { pausedIds } from "../breathing.js";
import { pressed, icon } from "./components.js";
import { state } from "../state.js";
import { normalizeLayout, pageLabel, pageIcon, pageHidden, tabHidden } from "../layout.js";

function workCard() {
  const w = read("work"), key = todayKey(), l = normalizeLayout(state.settings?.layout);
  if (pageHidden(l, "work")) return "";
  const name = pageLabel(l, "work", "Work");
  const link = html`<a class="linkbtn" data-page="work" href="${pageUrl("work")}">Open ${name} →</a>`;
  const head = (extra) => html`<h3 class="platehead">${icon(pageIcon(l, "work", "work"))} ${name}${extra}</h3>`;
  if (!w.goals.length) return html`<div class="plateblock">${head("")}<p class="hint">No goals yet. ${link}</p></div>`;
  const picks = todayPicks(w, key, pausedIds(state.settings, "goal", key)), done = picks.filter((t) => t.done).length;
  const goal = (t) => w.goals.find((g) => g.id === t.goal)?.name || "";
  return html`<div class="plateblock">${head(html` <span class="pts">${done}/${picks.length}</span>`)}
    ${picks.length ? html`<ul class="list dash">${picks.map((t) => html`<li class="tagged ${goalTheme(w, t.goal)}${t.done ? " done" : ""}">
      <button class="circle ${t.done ? "" : "border"}" data-act="wToggle" data-id="${t.id}" aria-pressed="${pressed(Boolean(t.done))}" aria-label="${t.done ? "Done" : "Mark done"}: ${t.name}">${t.done ? icon("check") : ""}</button>
      <div class="max"><div class="rname">${t.at ? html`<span class="wat">${clock(atTime(key, t.at))}</span> ` : ""}${t.name}</div><div class="small-text">${goal(t)}${t.due ? ` · ${t.due < key && !t.done ? "overdue, " : "due "}${shortDate(t.due)}` : ""}</div></div></li>`)}</ul>`
      : html`<p class="hint">Nothing open right now.</p>`}
    ${(() => { const n = staleTasks(w, key).length; return n ? html`<a class="stalelink" data-page="work" href="${pageUrl("work")}">${icon("alarm")}<span class="max">${n} task${n === 1 ? "" : "s"} over a week late: push back or archive</span>${icon("chevron_right")}</a>` : ""; })()}
    <p class="small">${link}</p></div>`;
}

// Check-in → Today: one "On your plate" panel with today's to-dos and today's Work (or House) tasks.
export function dashboardView() {
  const l = normalizeLayout(state.settings?.layout), todos = !pageHidden(l, "routines") && !tabHidden(l, "todos");
  return html`<section class="panel plate"><h2>On your plate</h2>${todos ? dashboardTodos() : ""}${workCard()}</section>`;
}
