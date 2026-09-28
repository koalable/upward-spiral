// My questions: choose, edit, reorder, and pick the streak and floor categories.
import { html } from "../util.js";

// One checklist item per line. Split on a regex so the build's whitespace trimming can't alter it.
const LINE_BREAK = /\r?\n/;
import { BUILTIN_ORDER, BUILTINS, QUESTION_KINDS, MAX_DAILY, DEFAULT_WEEKS_TO_LEVEL } from "../constants.js";
import { isLadder, levelOf, levelLabel } from "../ladder.js";
import { isScored, scoredQuestions, questionName } from "../scoring.js";
import { state, settings, hasQuestion } from "../state.js";
import { saveStatus, icon } from "./components.js";
import { GROUPS, groupOf, iconOf } from "../energy.js";

function editor() {
  const e = state.editQuestion;
  if (!e) return html`<p><button class="btn" data-act="qNew">Add a category</button></p>`;
  const kind = e.kind || "check";
  const canRevert = e.origin && settings().cats.some((q) => q.id === e.id && q.kind !== "builtin");
  return html`<div class="qform"><h3>${e.id ? "Edit category" : "New category"}</h3><div class="targets">
    <label>Name<input class="field" id="q-name" maxlength="60" value="${e.name || ""}" placeholder="e.g. Water"></label>
    <label>Energy group<select class="field" id="q-group">${GROUPS.filter((g) => g.id !== "show").map((g) => html`<option value="${g.id}" ${g.id === groupOf(e).id ? "selected" : ""}>${g.name} (${g.themeName})</option>`)}</select></label>
    <label>Type<select class="field" id="q-kind">${Object.entries(QUESTION_KINDS).map(([k, label]) => html`<option value="${k}" ${k === kind ? "selected" : ""}>${label}</option>`)}</select></label>
    ${kind === "check" ? html`<label class="full">Items, one per line (up to 4)<textarea class="field" id="q-items" rows="4" placeholder="Took vitamins">${(e.items || []).join("\n")}</textarea></label>` : ""}
    ${kind === "number" ? html`
      <label>Unit<input class="field" id="q-unit" maxlength="20" value="${e.unit || ""}" placeholder="glasses"></label>
      <label>Goal<select class="field" id="q-dir"><option value="min" ${e.dir !== "max" ? "selected" : ""}>At least</option><option value="max" ${e.dir === "max" ? "selected" : ""}>At most</option></select></label>
      <label>Target<input class="field" id="q-target" type="number" min="0" step="any" value="${e.target ?? ""}"></label>
      <label>Step for + / −<input class="field" id="q-step" type="number" min="0" step="any" value="${e.step ?? 1}"></label>` : ""}
    ${kind === "ladder" ? ladderFields(e) : ""}
  </div>
  ${kind !== "text" && kind !== "ladder" ? html`<label class="inline"><input type="checkbox" id="q-scored" ${e.scored !== false ? "checked" : ""}> Counts toward my score (worth 4 points)</label>` : ""}
  ${e.origin ? html`<p class="hint small">This swaps the built-in version for your own editable one. Anything already logged in this category today starts fresh.</p>` : ""}
  <p class="hint small">Changes apply from today. Past days keep the questions they were scored with.</p>
  <div class="row"><button class="btn" data-act="qSave">Save question</button><button class="btn ghost" data-act="qCancel">Cancel</button>
    ${canRevert ? html`<button class="linkbtn" data-act="qRevert">Restore the original</button>` : ""}</div></div>`;
}

function ladderFields(e) {
  const mode = e.mode || "days";
  const levels = e.levels || [];
  const list = mode === "minutes" ? levels.map((l) => l.minutes).join(", ") : levels.map((l) => l.days).join(", ");
  return html`
    <div class="full chips">Start from: <button class="chip" data-act="qTemplate" data-template="weekly">2× → 3× → 4× a week</button>
      <button class="chip" data-act="qTemplate" data-template="minutes">5 → 10 → 15 min a day</button></div>
    <label>Goal type<select class="field" id="q-mode">
      <option value="days" ${mode === "days" ? "selected" : ""}>Days per week</option>
      <option value="minutes" ${mode === "minutes" ? "selected" : ""}>Minutes a day</option></select></label>
    <label>${mode === "minutes" ? "Minutes a day, one number per level" : "Days per week, one number per level"}
      <input class="field" id="q-levels" value="${list}" placeholder="${mode === "minutes" ? "5, 10, 15" : "2, 3, 4"}"></label>
    ${mode === "minutes" ? html`<label>Days per week<input class="field" id="q-perweek" type="number" min="1" max="7" value="${levels[0]?.days ?? 5}"></label>` : ""}
    <label>Weeks in a row to level up<input class="field" id="q-weeks" type="number" min="1" max="12" value="${e.weeksToLevel ?? DEFAULT_WEEKS_TO_LEVEL}"></label>
    ${e.id && e.levels?.length ? html`<p class="hint small full">Currently on level ${levelOf(e).number}: ${levelLabel(e)}.</p>` : ""}`;
}

export function readQuestionForm(view) {
  const e = state.editQuestion;
  if (!e) return;
  const val = (id) => view.querySelector(`#${id}`)?.value;
  const name = val("q-name"); if (name !== undefined) e.name = name.trim();
  const kind = val("q-kind"); if (kind) e.kind = kind;
  const group = val("q-group"); if (group) e.group = group;
  const items = val("q-items"); if (items !== undefined) e.items = items.split(LINE_BREAK).map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const unit = val("q-unit"); if (unit !== undefined) e.unit = unit.trim();
  const dir = val("q-dir"); if (dir) e.dir = dir;
  const target = val("q-target"); if (target !== undefined) e.target = target === "" ? undefined : Math.max(0, Number(target));
  const step = val("q-step"); if (step !== undefined) e.step = step === "" ? 1 : Math.max(0, Number(step));
  const scored = view.querySelector("#q-scored"); if (scored) e.scored = scored.checked;
  const mode = val("q-mode"); if (mode) e.mode = mode;
  const levels = val("q-levels");
  if (levels !== undefined) {
    const nums = levels.split(/[,\s]+/).map(Number).filter((n) => n > 0).slice(0, 10);
    const perWeek = Math.min(7, Math.max(1, Number(val("q-perweek")) || 5));
    e.levels = nums.map((n) => (e.mode === "minutes" ? { days: perWeek, minutes: n } : { days: Math.min(7, n) }));
  }
  const weeks = val("q-weeks"); if (weeks !== undefined) e.weeksToLevel = Math.max(1, Math.min(12, Number(weeks) || DEFAULT_WEEKS_TO_LEVEL));
}

export function questionsView() {
  const s = settings(), scored = scoredQuestions(s), last = s.cats.length - 1;
  // Sections: the three energy groups (scored), then everything tracked but not scored.
  const sections = [
    ...GROUPS.filter((g) => g.id !== "show").map((g) => ({ g, test: (q) => isScored(q) && groupOf(q).id === g.id })),
    { g: null, test: (q) => !isScored(q) },
  ];
  const row = (q, i, list, k) => {
    const up = k > 0 ? list[k - 1][1] - i : 0, down = k < list.length - 1 ? list[k + 1][1] - i : 0;
    return html`<li class="qrow">
    <div class="qmain">${isScored(q) ? html`<span class="tchip">${icon(iconOf(q))}</span>` : ""}<b>${questionName(q)}</b>
      <span class="tag">${q.kind === "builtin" ? "Built-in" : QUESTION_KINDS[q.kind].replace(" (not scored)", "")}</span>
      ${isLadder(q) ? html`<span class="tag on">Level ${levelOf(q).number}: ${levelLabel(q)}</span>` : isScored(q) ? "" : html`<span class="tag">Tracked only</span>`}
      ${q.id === s.lead ? html`<span class="tag lead">Streak</span>` : ""}</div>
    <div class="qbtns">
      <button class="x" data-act="qMove" data-index="${i}" data-by="${up}" aria-label="Move ${questionName(q)} up" ${up ? "" : "disabled"}>↑</button>
      <button class="x" data-act="qMove" data-index="${i}" data-by="${down}" aria-label="Move ${questionName(q)} down" ${down ? "" : "disabled"}>↓</button>
      <button class="linkbtn" data-act="qEdit" data-index="${i}">Edit</button>
      <button class="x" data-act="qRemove" data-index="${i}" aria-label="Remove ${questionName(q)}">×</button></div></li>`;
  };
  const groupsHtml = sections.map(({ g, test }) => {
    const list = s.cats.map((q, i) => [q, i]).filter(([q]) => test(q));
    if (!list.length) return "";
    const head = g ? html`<div class="egrouphead ${g.theme}"><span class="gicon">${icon(g.icon)}</span><div><div class="tname">${g.themeName}</div><h3>${g.name}</h3></div></div>`
      : html`<h3 class="also">Also tracking <span class="muted small">(not scored)</span></h3>`;
    return html`${head}<ul class="qlist${g ? ` qgroup themed ${g.theme}` : ""}">${list.map(([q, i], k) => row(q, i, list, k))}</ul>`;
  });
  const missing = BUILTIN_ORDER.filter((id) => !hasQuestion(id));
  return html`
    <section class="panel"><h2>Categories</h2>
      <p class="hint">🔒 Only you can see these. Each scored category is worth 4 points. Your total is scaled so it's always out of ${MAX_DAILY}, however many you pick. Eight is the classic setup.</p>
      <p class="small"><b>${scored.length}</b> scored · <b>${s.cats.length - scored.length}</b> tracked only ${saveStatus()}</p>
      ${s.cats.length ? groupsHtml : html`<p class="muted">No categories yet.</p>`}
      ${missing.length ? html`<p class="hint spaced">Add back a built-in:</p><div class="chips">${missing.map((id) => html`<button class="chip" data-act="qAddBuiltin" data-id="${id}">+ ${BUILTINS[id].name}</button>`)}</div>` : ""}
      <div class="formslot">${editor()}</div></section>
    <section class="panel"><h2>Streak and floor day</h2>
      <div class="targets"><label>My streak runs on<select class="field" id="q-lead">
        <option value="">None (any check-in counts)</option>
        ${scored.map((q) => html`<option value="${q.id}" ${q.id === s.lead ? "selected" : ""}>${questionName(q)}</option>`)}</select></label></div>
      <p class="hint">A streak day means at least 1 point in this category (or a day off or freeze).</p>
      <p class="small"><b>My floor day</b>: at least 1 point in each of these.</p>
      <div class="floorlist">${scored.length ? scored.map((q) => html`<label class="inline"><input type="checkbox" data-floor="${q.id}" ${s.floor.includes(q.id) ? "checked" : ""}> ${questionName(q)}</label>`) : html`<span class="muted small">Add a scored question first.</span>`}</div>
    </section>`;
}
