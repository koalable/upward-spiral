// Medication and substance log: private per person, one document per day.
import { state, settings, findQuestion, isEditable } from "./state.js";
import { dayFor, commitDay } from "./day.js";
import { save, paths } from "./store.js";
import { clone, newId, isSet, toNum, getPath, setPath, dateKey, todayKey, atTime, clock, duration } from "./util.js";
import { HOUR_MS } from "./constants.js";

export const medList = () => settings().meds;
export const activeMeds = () => medList().filter((m) => m.active !== false);
export const findMed = (id) => medList().find((m) => m.id === id);

export const logsOn = (key) => [...(state.medlog[key]?.items || [])].sort((a, b) => a.at - b.at);
export const logsFor = (med, key) => logsOn(key).filter((x) => x.medId === med.id);

export function lastTaken(med) {
  let last = null;
  for (const doc of Object.values(state.medlog)) {
    for (const x of doc.items || []) if (x.medId === med.id && (!last || x.at > last.at)) last = x;
  }
  return last;
}

export const doseLabel = (dose, unit) => (isSet(dose) ? `${dose}${unit ? " " + unit : ""}` : "");
const scheduleOf = (med) => (med.times || []).filter(Boolean).sort();

// One line of status per item: what's due, when the next dose is OK, and progress toward a daily max.
export function medStatus(med, now = Date.now()) {
  const today = todayKey();
  const takenToday = logsFor(med, today).length;
  const parts = [];
  let warn = false;

  const times = scheduleOf(med);
  if (times.length) {
    if (takenToday < times.length) {
      const next = atTime(today, times[takenToday]);
      const due = now >= next;
      parts.push(due ? `Due now (${clock(next)})` : `Next at ${clock(next)}`);
      warn ||= due;
    } else {
      parts.push(`✓ All ${times.length} done today`);
    }
  }
  if (toNum(med.every) > 0) {
    const last = lastTaken(med);
    if (last) {
      const okAt = last.at + toNum(med.every) * HOUR_MS;
      parts.push(now < okAt ? `Next dose OK at ${clock(okAt)} (in ${duration(okAt - now)})` : `Last ${clock(last.at)} · OK to take`);
    }
  }
  if (toNum(med.max) > 0) {
    parts.push(`${takenToday} of ${toNum(med.max)} today`);
    if (takenToday >= toNum(med.max)) { parts.push("You've reached your daily max"); warn = true; }
  } else if (!times.length && takenToday) {
    parts.push(`${takenToday} today`);
  }
  return { text: parts.join(" · ") || "Tap to log", warn };
}


// ---------- writing ----------
function saveLogDoc(key, doc) {
  state.medlog[key] = doc;
  save(paths.medlog(state.uid, key), doc, 0);
}

// How many Substances units one log adds: 1, ½, or 0. Older saves used `true` for 1.
export const substanceUnits = (x) => (x === true ? 1 : Math.max(0, toNum(x)));

// Items marked "counts as substance" add their units to the Substances question on that day.
function adjustSubstances(delta, at) {
  const key = dateKey(new Date(at));
  const q = findQuestion("substances");
  const path = q?.kind === "builtin" ? "substances" : q?.kind === "number" ? "c.substances" : null;
  if (!path || !isEditable(key)) return;
  const a = dayFor(key).a;
  const current = getPath(a, path);
  setPath(a, path, Math.max(0, (isSet(current) ? toNum(current) : 0) + delta));
  commitDay(key);
}

export function logMed({ med = null, name, dose, unit, at = Date.now(), note }) {
  const entry = {
    id: newId("l"),
    medId: med?.id || null,
    name: med?.name || name || "",
    dose: isSet(dose) ? dose : med?.dose || "",
    unit: med ? med.unit || "" : unit || "",
    at,
  };
  if (note) entry.note = note;
  if (substanceUnits(med?.counts)) entry.counts = substanceUnits(med.counts);

  const key = dateKey(new Date(at));
  const doc = state.medlog[key] ? clone(state.medlog[key]) : { date: key, items: [] };
  doc.items.push(entry);
  saveLogDoc(key, doc);
  if (entry.counts) adjustSubstances(substanceUnits(entry.counts), at);
  return { key, entry };
}

export function deleteMedLog(key, id) {
  const doc = state.medlog[key] && clone(state.medlog[key]);
  if (!doc) return;
  const entry = doc.items.find((x) => x.id === id);
  doc.items = doc.items.filter((x) => x.id !== id);
  saveLogDoc(key, doc);
  if (entry?.counts) adjustSubstances(-substanceUnits(entry.counts), entry.at);
}

export function updateMedLog(key, id, { time, dose }) {
  const doc = state.medlog[key] && clone(state.medlog[key]);
  const entry = doc?.items.find((x) => x.id === id);
  if (!entry) return;
  if (time) entry.at = atTime(key, time);
  entry.dose = dose;
  saveLogDoc(key, doc);
}
