// To-dos: private lists for today, this week, and this month.
import { html, todayKey, weekStart, monthKey } from "../util.js";
import { state } from "../state.js";

function goalList(key, title) {
  const items = state.goals[key]?.items || [];
  return html`<section class="panel"><h2>${title}</h2><ul class="goallist">
    ${items.length ? items.map((g, i) => html`<li class="${g.done ? "done" : ""}">
      <input type="checkbox" data-goal-done="${key}" data-index="${i}" ${g.done ? "checked" : ""} aria-label="Mark “${g.t}” done"><span>${g.t}</span>
      <button class="x" data-act="goalRemove" data-goal="${key}" data-index="${i}" aria-label="Remove">×</button></li>`) : html`<li class="muted small">Nothing yet.</li>`}
    </ul><div class="addrow"><input class="field" placeholder="Add a to-do" data-goal-input="${key}" aria-label="New to-do for ${title}">
      <button class="btn ghost" data-act="goalAdd" data-goal="${key}">Add</button></div></section>`;
}

export function todosView() {
  const today = todayKey();
  return html`<p class="hint">One-off tasks. For things you do again and again, add a habit instead. Private to you.</p>
    <div class="goalcols">${goalList("d" + today, "Today")}${goalList("w" + weekStart(today), "This week")}${goalList("m" + monthKey(today), "This month")}</div>`;
}
