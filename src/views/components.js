// Reusable pieces of markup. Everything returns escaped Html via the html`` tag.
import { html } from "../util.js";
import { state, memberName } from "../state.js";

export const pressed = (on) => (on ? "true" : "false");

export const toggle = (path, label, on) => html`
  <button class="tog" data-act="toggle" data-answer="${path}" aria-pressed="${pressed(on)}"><span class="box">${on ? "✓" : ""}</span>${label}</button>`;

export const stepper = (path, value, step, label) => html`
  <span class="step">
    <button data-act="step" data-answer="${path}" data-by="${-step}" aria-label="Minus ${step}">−</button>
    <input type="number" inputmode="decimal" min="0" data-answer="${path}" value="${value ?? ""}" placeholder="–" aria-label="${label}">
    <button data-act="step" data-answer="${path}" data-by="${step}" aria-label="Plus ${step}">+</button>
  </span>`;

export const choices = (path, options, value, tone = "") => html`
  <span class="seg ${tone}">${options.map(([v, label]) => html`<button data-act="choose" data-answer="${path}" data-value="${v}" aria-pressed="${pressed(value !== undefined && value !== "" && String(value) === String(v))}">${label}</button>`)}</span>`;

export const zeroToFour = [0, 1, 2, 3, 4].map((n) => [n, String(n)]);

export const cardHead = (title, id) => html`<div class="cat-head"><h2>${title}</h2>${id ? html`<span class="pts" data-points="${id}"></span>` : ""}</div>`;

export function change(now, before) {
  const d = now - before;
  if (!now && !before) return html`<span class="muted">·</span>`;
  if (d > 0) return html`<span class="up">▲ ${d}</span>`;
  if (d < 0) return html`<span class="down">▼ ${-d}</span>`;
  return html`<span class="muted">even</span>`;
}

export const who = (uid) => html`${memberName(uid)}${uid === state.uid ? html` <span class="muted">(you)</span>` : ""}`;

export const rule = (term, badge, text) => html`
  <div class="rule"><dt>${term}${badge ? html` <span class="rulepts">${badge}</span>` : ""}</dt><dd>${text}</dd></div>`;

export const saveStatus = () => html`<span class="saved" id="saved" role="status" aria-live="polite"></span>`;

export const progressBar = (label, value, goal, unit) => html`
  <div class="progrow"><div class="top"><span>${label}</span><span class="muted">${value} / ${goal} ${unit}</span></div>
  <div class="prog" role="progressbar" aria-label="${label}" aria-valuenow="${value}" aria-valuemax="${goal}"><b style="width:${goal ? Math.min(100, Math.round((value / goal) * 100)) : 0}%"></b></div></div>`;

// Lucide icons (icon font from the CDN). Names below are the ones the views use.
const LUCIDE = {
  check: "check", play_arrow: "play", close: "x", skip_next: "skip-forward", arrow_back: "arrow-left", timer: "timer",
  stop: "square", add: "plus", edit: "pencil", playlist_add: "list-plus", event: "calendar-plus", arrow_upward: "arrow-up",
  arrow_downward: "arrow-down", delete: "trash-2", lock: "lock", chevron_left: "chevron-left", chevron_right: "chevron-right",
  wb_sunny: "sunrise", light_mode: "sun", bedtime: "moon", all_inclusive: "infinity", checklist: "list-checks",
  done_all: "check-check", dark_mode: "moon", edit_note: "notebook-pen", insights: "chart-line", work: "briefcase", circle: "circle",
  pin: "pin", swap: "shuffle", flag: "flag", target: "target",
};
export const icon = (name) => html`<i class="icon-${LUCIDE[name] || name}" aria-hidden="true"></i>`;
