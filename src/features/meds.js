// Meds & substances: one-tap logging, the personal list, pop-up alerts, and history.
import { state } from "../state.js";
import { sheet, openSheet, closeSheet } from "../state.js";
import { saveSettings } from "../day.js";
import { clone, todayKey, addDays, newId, clock, atTime } from "../util.js";
import { findMed, medList, logMed, deleteMedLog, updateMedLog, doseLabel, substanceUnits, setLogsTime, logsOn } from "../meds.js";
import { hhmmOf } from "../util.js";
import { ui, render } from "../render.js";
import { medsView, patchMedStatus } from "../views/meds.js";

const $ = (sel) => ui.view.querySelector(sel);

function showToast({ key, entry }) {
  const dose = entry.dose ? " " + doseLabel(entry.dose, entry.unit) : "";
  state.toast = { key, id: entry.id, text: `${entry.name}${dose} at ${clock(entry.at)}`, when: Date.now() };
 
}

function saveMed() {
  const e = sheet("med");
  for (const k of ["name", "dose", "unit", "notes"]) e[k] = String(e[k] || "").trim();
  e.times = [...(e.times || [])].filter(Boolean);
  e.every = e.every === "" ? undefined : Math.max(0, Number(e.every));
  e.max = e.max === "" ? undefined : Math.max(0, Math.round(Number(e.max)));
  if (!e.name) return $("#med-name").focus(), "none";
  const med = { id: e.id || newId("m"), name: e.name, kind: e.kind || "rx", dose: e.dose || "", unit: e.unit || "", times: (e.times || []).slice(0, 4), notes: e.notes || "", counts: substanceUnits(e.counts), active: true };
  if (e.every > 0) med.every = e.every;
  if (e.max > 0) med.max = e.max;
  const list = medList(), at = list.findIndex((m) => m.id === med.id);
  if (at >= 0) list[at] = med; else list.push(med);
  closeSheet();
  saveSettings();
 
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
    medUndo() { if (state.toast) deleteMedLog(state.toast.key, state.toast.id); state.toast = null; },
    medDeleteLog(el) {
      if (!confirm("Delete this entry?")) return "none";
      deleteMedLog(el.dataset.day, el.dataset.id);
      if (state.toast?.id === el.dataset.id) state.toast = null;
     
    },
    medEditLog(el) { openSheet("log", { id: el.dataset.id }); state.toast = null; state.tab = "meds"; },
    medCancelLog: closeSheet,
    medSaveLog(el) {
      updateMedLog(el.dataset.day, el.dataset.id, { date: $("#log-date").value, time: $("#log-time").value, dose: $("#log-dose").value.trim() });
      closeSheet();
     
    },
    medWeek(el) { state.medWeek = Math.min(0, (state.medWeek || 0) + Number(el.dataset.by)); },
    // bulk edit: pick several logged doses, set one date and time for all
    medBulk() { openSheet("bulk", { picks: [], date: todayKey(), time: hhmmOf(Date.now()) }); },
    medBulkCancel: closeSheet,
    medPick(el) {
      const d = sheet("bulk"), k = `${el.dataset.day}|${el.dataset.id}`;
      if (!d) return "none";
      const first = !d.picks.length;
      d.picks = d.picks.includes(k) ? d.picks.filter((x) => x !== k) : [...d.picks, k];
      // the first pick suggests its own day and time as the starting point
      const x = first && logsOn(el.dataset.day).find((y) => y.id === el.dataset.id);
      if (x) { d.date = el.dataset.day; d.time = hhmmOf(x.at); }
    },
    medPickDay(el) {
      const d = sheet("bulk"), keys = logsOn(el.dataset.day).map((x) => `${el.dataset.day}|${x.id}`);
      if (!d) return "none";
      const all = keys.every((k) => d.picks.includes(k));
      d.picks = all ? d.picks.filter((k) => !keys.includes(k)) : [...new Set([...d.picks, ...keys])];
      if (!all && keys.length) d.date = el.dataset.day;
    },
    medBulkSave() {
      const d = sheet("bulk");
      if (!d?.picks.length || !d.time) return "none";
      const n = setLogsTime(d.picks, d.date && d.date <= todayKey() ? d.date : todayKey(), d.time);
      state.toast = null;
      closeSheet();
      return n ? undefined : "none";
    },
    medNew() { openSheet("med", { kind: "rx", times: [] }); },
    medEdit(el) { openSheet("med", clone(medList()[Number(el.dataset.index)])); },
    medCancel: closeSheet,
    medSave: saveMed,
    medRemove(el) {
      const list = medList(), med = list[Number(el.dataset.index)];
      if (!confirm(`Remove "${med.name}" from your list? Past entries stay in your history.`)) return "none";
      list.splice(Number(el.dataset.index), 1);
      saveSettings();
     
    },
    medLogOther: logOther,
  },
  busy: (view) => Boolean(view.querySelector("details.oneoff[open]")),
  patch: (tab, view) => { if (tab === "meds") patchMedStatus(view); },
};
