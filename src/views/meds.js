// Meds & substances: one-tap logging, the personal list (with reminder times), and history.
import { html, todayKey, addDays, longDate, clock, hhmmOf, atTime } from "../util.js";
import { MED_KINDS, TOAST_MS, MEDLOG_DAYS } from "../constants.js";
import { state, hasQuestion } from "../state.js";
import { sheet } from "../state.js";
import { medList, activeMeds, logsOn, medStatus, doseLabel, substanceUnits } from "../meds.js";
import { saveStatus } from "./components.js";

export const toastVisible = () => state.toast && Date.now() - state.toast.when < TOAST_MS;

const toast = () => (toastVisible() ? html`
  <div class="banner good medtoast">Logged ${state.toast.text}.
    <button class="linkbtn" data-act="medUndo">Undo</button>
    <button class="linkbtn" data-act="medEditLog" data-day="${state.toast.key}" data-id="${state.toast.id}">Change time or dose</button>
  </div>` : "");

function logButtons() {
  const meds = activeMeds();
  if (!meds.length) return "";
  return html`<div class="medgrid">${meds.map((m) => {
    const s = medStatus(m);
    return html`<button class="medbtn" data-act="medTake" data-id="${m.id}">
      <span class="medname">${m.name} ${m.dose ? html`<span class="muted">${doseLabel(m.dose, m.unit)}</span>` : ""}</span>
      <span class="medstat${s.warn ? " warn" : ""}" data-med-status="${m.id}">${s.text}</span></button>`;
  })}</div>`;
}

// The compact card on Today.
export function medQuickLog() {
  if (!medList().length) return "";
  return html`<section class="cat medcard">
    <div class="cat-head"><h2>Meds &amp; substances</h2><button class="linkbtn" data-act="openTab" data-tab="meds">Open</button></div>
    <p class="hint">Tap to log it now. Private to you.</p>
    <div id="live-toast">${toast()}</div>${logButtons()}</section>`;
}

export function patchMedStatus(view) {
  for (const m of medList()) {
    const el = view.querySelector(`[data-med-status="${m.id}"]`);
    if (!el) continue;
    const s = medStatus(m);
    el.textContent = s.text;
    el.classList.toggle("warn", s.warn);
  }
  const t = view.querySelector("#live-toast");
  if (t && !toastVisible() && t.innerHTML) { state.toast = null; t.innerHTML = ""; }
}

function medForm() {
  const e = sheet("med");
  if (!e) return html`<p><button class="btn" data-act="medNew">Add a medication or substance</button></p>`;
  const times = [...(e.times || []), "", "", "", ""].slice(0, 4);
  return html`<div class="qform"><h3>${e.id ? "Edit" : "New"}</h3><div class="targets">
    <label>Name<input class="field" id="med-name" data-draft="name" maxlength="60" value="${e.name || ""}" placeholder="e.g. Sertraline, Coffee, Wine"></label>
    <label>Type<select class="field" id="med-kind" data-draft="kind">${Object.entries(MED_KINDS).map(([k, label]) => html`<option value="${k}" ${k === (e.kind || "rx") ? "selected" : ""}>${label}</option>`)}</select></label>
    <label>Usual dose<input class="field" id="med-dose" data-draft="dose" maxlength="20" value="${e.dose || ""}" placeholder="50"></label>
    <label>Unit<input class="field" id="med-unit" data-draft="unit" maxlength="20" value="${e.unit || ""}" placeholder="mg, pill, drink"></label>
    <label class="full">Reminder times (optional, sends a phone notification)<span class="timesrow">${times.map((t, i) => html`<input class="field" type="time" data-draft="times.${i}" value="${t}" aria-label="Time ${i + 1}">`)}</span></label>
    <label>Hours between doses (optional)<input class="field" id="med-every" data-draft="every" data-num type="number" min="0" step="0.5" value="${e.every ?? ""}" placeholder="e.g. 6"></label>
    <label>Daily max (optional)<input class="field" id="med-max" data-draft="max" data-num type="number" min="0" step="1" value="${e.max ?? ""}" placeholder="e.g. 4"></label>
    <label class="full">Notes<input class="field" id="med-notes" data-draft="notes" maxlength="200" value="${e.notes || ""}" placeholder="With food, etc."></label>
  </div>
  ${hasQuestion("substances") ? html`<div class="targets"><label class="full">Each log adds to my Substances score
    <select class="field" id="med-counts" data-draft="counts" data-num>${[[0, "Nothing"], [1, "1 unit"], [0.5, "½ unit (split doses)"], [0.25, "¼ unit"]].map(([v, label]) => html`<option value="${v}" ${substanceUnits(e.counts) === v ? "selected" : ""}>${label}</option>`)}</select></label></div>` : ""}
  <p class="hint small">Use the numbers your doctor or pharmacist gave you. The app keeps track; it doesn't check doses.</p>
  <div class="row"><button class="btn" data-act="medSave">Save</button><button class="btn ghost" data-act="medCancel">Cancel</button></div></div>`;
}

const UNIT_LABEL = { 1: "1 unit", 0.5: "½ unit", 0.25: "¼ unit" };

function listItem(m, i) {
  const times = (m.times || []).filter(Boolean);
  return html`<li class="qrow">
    <div class="qmain"><b>${m.name}</b>${m.dose ? html`<span class="muted">${doseLabel(m.dose, m.unit)}</span>` : ""}
      <span class="tag">${MED_KINDS[m.kind] || ""}</span>${substanceUnits(m.counts) ? html`<span class="tag on">Counts as ${UNIT_LABEL[substanceUnits(m.counts)] || `${substanceUnits(m.counts)} unit`}</span>` : ""}</div>
    <div class="qbtns"><button class="linkbtn" data-act="medEdit" data-index="${i}">Edit</button><button class="x" data-act="medRemove" data-index="${i}" aria-label="Remove ${m.name}">×</button></div>
    ${times.length ? html`<div class="calrow small muted">Reminds at ${times.map((t) => clock(atTime(todayKey(), t))).join(", ")}</div>` : ""}
  </li>`;
}

function logRow(x, key) {
  if (sheet("log")?.id === x.id) return html`<li class="logrow editing">
    <input class="field" type="date" id="log-date" value="${key}" max="${todayKey()}" min="${addDays(todayKey(), -MEDLOG_DAYS)}" aria-label="Date">
    <input class="field" type="time" id="log-time" value="${hhmmOf(x.at)}" aria-label="Time">
    <input class="field" id="log-dose" value="${x.dose || ""}" aria-label="Dose" placeholder="Dose"><span class="muted">${x.unit || ""}</span>
    <button class="btn" data-act="medSaveLog" data-day="${key}" data-id="${x.id}">Save</button><button class="linkbtn" data-act="medCancelLog">Cancel</button></li>`;
  return html`<li class="logrow"><span class="logtime">${clock(x.at)}</span>
    <span class="logname">${x.name} ${x.dose ? html`<span class="muted">${doseLabel(x.dose, x.unit)}</span>` : ""} ${x.note ? html`<span class="muted small">${x.note}</span>` : ""}</span>
    <button class="linkbtn" data-act="medEditLog" data-day="${key}" data-id="${x.id}">Edit</button>
    <button class="x" data-act="medDeleteLog" data-day="${key}" data-id="${x.id}" aria-label="Delete entry">×</button></li>`;
}

function history() {
  const today = todayKey();
  return [0, 1, 2, 3, 4, 5, 6].map((n) => addDays(today, -n)).map((key, n) => {
    const logs = logsOn(key);
    if (!logs.length && n) return "";
    const title = n === 0 ? "Today" : n === 1 ? "Yesterday" : longDate(key);
    return html`<h3 class="rulehead">${title}</h3><ul class="loglist">${logs.length ? logs.map((x) => logRow(x, key)) : html`<li class="muted small">Nothing logged yet.</li>`}</ul>`;
  });
}

function otherForm() {
  return html`<details class="oneoff"><summary>Log something else, or pick a different time</summary><div class="targets">
    <label>What<select class="field" id="other-med"><option value="">Something not on my list…</option>${medList().map((m) => html`<option value="${m.id}">${m.name}</option>`)}</select></label>
    <label>Name (if not on list)<input class="field" id="other-name" maxlength="60"></label>
    <label>Dose<input class="field" id="other-dose" maxlength="20"></label>
    <label>Unit<input class="field" id="other-unit" maxlength="20"></label>
    <label>Time<input class="field" type="time" id="other-time" value="${hhmmOf(Date.now())}"></label>
    <label>Day<select class="field" id="other-day"><option value="0">Today</option><option value="-1">Yesterday</option></select></label>
    <label class="full">Note<input class="field" id="other-note" maxlength="200" placeholder="Optional"></label>
  </div><div class="row"><button class="btn" data-act="medLogOther">Log it</button></div></details>`;
}

export function medsView() {

  return html`
    <p class="privacy small muted">🔒 Private to you. The group never sees your medications or doses. If a substance counts toward your score, only the score changes.</p>
    <section class="panel"><h2>Log it</h2><div id="live-toast">${toast()}</div>
      ${logButtons() || html`<p class="hint">Add your medications and substances below, then log each one with a single tap.</p>`}
      ${otherForm()}</section>
    <section class="panel"><h2>My list</h2><ul class="qlist">${medList().length ? medList().map(listItem) : html`<li class="muted small">Nothing yet.</li>`}</ul>
      <div class="formslot">${medForm()}</div></section>
    <section class="panel"><h2>Reminders</h2>
      <p class="hint">Add scheduled times to an item and your phone reminds you then, unless that dose is already logged. Turn reminders on under Notifications.</p>
      <p><button class="btn ghost" data-act="openTab" data-tab="notify">Notification settings</button></p>${saveStatus()}</section>
    <section class="panel"><h2>History</h2>${history()}</section>`;
}

