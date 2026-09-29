// Meds & substances: one-tap logging, the personal list, pop-up alerts, and history.
import { state } from "../state.js";
import { saveSettings } from "../day.js";
import { clone, todayKey, addDays, newId, clock, atTime } from "../util.js";
import { findMed, medList, logMed, deleteMedLog, updateMedLog, doseLabel, substanceUnits } from "../meds.js";
import { enableAlerts, disableAlerts, scheduleAlerts } from "../notifications.js";
import { ui, render } from "../render.js";
import { medsView, readMedForm, patchMedStatus } from "../views/meds.js";

const $ = (sel) => ui.view.querySelector(sel);

function showToast({ key, entry }) {
  const dose = entry.dose ? " " + doseLabel(entry.dose, entry.unit) : "";
  state.toast = { key, id: entry.id, text: `${entry.name}${dose} at ${clock(entry.at)}`, when: Date.now() };
  scheduleAlerts();
}

function saveMed() {
  readMedForm(ui.view);
  const e = state.editMed;
  if (!e.name) return $("#med-name").focus(), "none";
  const med = { id: e.id || newId("m"), name: e.name, kind: e.kind || "rx", dose: e.dose || "", unit: e.unit || "", times: (e.times || []).slice(0, 4), notes: e.notes || "", counts: substanceUnits(e.counts), active: true };
  if (e.every > 0) med.every = e.every;
  if (e.max > 0) med.max = e.max;
  const list = medList(), at = list.findIndex((m) => m.id === med.id);
  if (at >= 0) list[at] = med; else list.push(med);
  state.editMed = null;
  saveSettings();
  scheduleAlerts();
}

function logOther() {
  const med = findMed($("#other-med").value);
  const name = $("#other-name").value.trim();
  if (!med && !name) return $("#other-name").focus(), "none";
  const day = addDays(todayKey(), Number($("#other-day").value));
  const at = atTime(day, $("#other-time").value || "00:00");
  showToast(logMed({ med, name, dose: $("#other-dose").value.trim() || undefined, unit: $("#other-unit").value.trim(), at, note: $("#other-note").value.trim() }));
}

export default {
  tabs: [["meds", "Meds", medsView]],
  actions: {
    medTake(el) { const med = findMed(el.dataset.id); if (med) showToast(logMed({ med })); },
    medUndo() { if (state.toast) deleteMedLog(state.toast.key, state.toast.id); state.toast = null; scheduleAlerts(); },
    medDeleteLog(el) {
      if (!confirm("Delete this entry?")) return "none";
      deleteMedLog(el.dataset.day, el.dataset.id);
      if (state.toast?.id === el.dataset.id) state.toast = null;
      scheduleAlerts();
    },
    medEditLog(el) { state.editLog = el.dataset.id; state.toast = null; state.tab = "meds"; },
    medCancelLog() { state.editLog = null; },
    medSaveLog(el) {
      updateMedLog(el.dataset.day, el.dataset.id, { time: $("#log-time").value, dose: $("#log-dose").value.trim() });
      state.editLog = null;
      scheduleAlerts();
    },
    medNew() { state.editMed = { kind: "rx", times: [] }; },
    medEdit(el) { state.editMed = clone(medList()[Number(el.dataset.index)]); },
    medCancel() { state.editMed = null; },
    medSave: saveMed,
    medRemove(el) {
      const list = medList(), med = list[Number(el.dataset.index)];
      if (!confirm(`Remove "${med.name}" from your list? Past entries stay in your history.`)) return "none";
      list.splice(Number(el.dataset.index), 1);
      saveSettings();
      scheduleAlerts();
    },
    medLogOther: logOther,
    alertsOn() { enableAlerts().then(render); return "none"; },
    alertsOff() { disableAlerts(); },
  },
  busy: (view) => Boolean(state.editMed || state.editLog || view.querySelector("details.oneoff[open]")),
  leave: (tab, view) => { if (tab === "meds") readMedForm(view); },
  patch: (tab, view) => { if (tab === "meds") patchMedStatus(view); },
  data: (name) => { if (name === "medlog" || name === "loaded") scheduleAlerts(); },
  midnight: scheduleAlerts,
};
