// Journal: my daily reflections, searchable. Private.
import { html, todayKey, dateRange, longDate } from "../util.js";
import { state } from "../state.js";

export function journalView() {
  const entries = dateRange(state.historyStart, todayKey()).reverse()
    .map((d) => [d, state.days[d]?.a?.reflection])
    .filter(([, text]) => text && String(text).trim());
  return html`<section class="panel"><h2>Journal</h2>
    <p class="hint">Your daily reflections, newest first. Only you can see these.</p>
    <input class="field jsearch" data-search placeholder="Search your entries" aria-label="Search journal">
    <div id="jlist">${entries.length
      ? entries.map(([d, text]) => html`<div class="jitem" data-text="${(d + " " + text).toLowerCase()}"><div class="jdate">${longDate(d)}</div><div class="jtext">${text}</div></div>`)
      : html`<p class="muted">No reflections yet. Write one under Today.</p>`}</div></section>`;
}

export function filterJournal(view, query) {
  const q = query.toLowerCase();
  view.querySelectorAll("#jlist .jitem").forEach((el) => { el.hidden = Boolean(q) && !el.dataset.text.includes(q); });
}
