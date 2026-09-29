// Reflect: today's reflection, then past ones, searchable. Private.
import { html, todayKey, dateRange, longDate } from "../util.js";
import { state, isEditable } from "../state.js";
import { answers } from "../day.js";
import { saveStatus } from "./components.js";

const PROMPTS = ["What went well?", "What drained you, and what filled you back up?", "What would make tomorrow a little easier?", "What are you glad you did?", "Where did you give yourself some grace today?"];

export function reflectView() {
  const a = answers(), open = isEditable(state.date), d = new Date(`${state.date}T12:00:00`);
  const prompt = PROMPTS[(d.getDate() + d.getMonth()) % PROMPTS.length];
  return html`<section class="panel reflectnow"><h2>${state.date === todayKey() ? "Today" : longDate(state.date)}</h2>
      <p class="hint">${prompt}</p>
      <textarea class="field" data-answer="reflection" rows="6" placeholder="A line or two…" aria-label="Reflection" ${open ? "" : "disabled"}>${a.reflection || ""}</textarea>
      ${saveStatus()}</section>
    ${journalView()}`;
}

export function journalView() {
  const entries = dateRange(state.historyStart, todayKey()).reverse()
    .map((d) => [d, state.days[d]?.a?.reflection])
    .filter(([, text]) => text && String(text).trim());
  return html`<section class="panel"><h2>Past reflections</h2>
    <p class="hint">Newest first. Only you can see these.</p>
    <input class="field jsearch" data-search placeholder="Search your entries" aria-label="Search journal">
    <div id="jlist">${entries.length
      ? entries.map(([d, text]) => html`<div class="jitem" data-text="${(d + " " + text).toLowerCase()}"><div class="jdate">${longDate(d)}</div><div class="jtext">${text}</div></div>`)
      : html`<p class="muted">No reflections yet.</p>`}</div></section>`;
}

export function filterJournal(view, query) {
  const q = query.toLowerCase();
  view.querySelectorAll("#jlist .jitem").forEach((el) => { el.hidden = Boolean(q) && !el.dataset.text.includes(q); });
}
