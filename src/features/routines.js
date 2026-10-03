// Routines: check off recurring tasks, run timers, and set routines up.
import { state, isEditable, sheet, openSheet, closeSheet } from "../state.js";
import { save, paths } from "../store.js";
import { edit as docEdit, read } from "../docs.js";
import { clone, newId, todayKey } from "../util.js";
import { ui, render } from "../render.js";
import { doneCount, target, EVERY_DAY, WEEKDAYS, ritualRunsThisWeek } from "../routines.js";
import { routinesView, routineSetupView, patchRoutines, modeOf, routineData, ritualSteps } from "../views/routines.js";

const $ = (sel) => ui.view.querySelector(sel);

const editList = (fn) => { docEdit("routines", (data) => { fn(data.items, data); }); };

function setCount(id, key, n) {
  if (!isEditable(key)) return "none";
  const doc = clone(state.routinelog[key] || { date: key, done: {} });
  doc.done ||= {};
  if (n > 0) doc.done[id] = n; else delete doc.done[id];
  state.routinelog[key] = doc;
  save(paths.routineLog(state.uid, key), doc, 300);
  creditRitual(id, key);
}

// A ritual linked to a project task ("Post 3× this week"): once it has run enough times this week, tick the task.
function creditRitual(habitId, key) {
  const { items, rituals } = routineData();
  const habit = items.find((r) => r.id === habitId), rit = habit && rituals.find((r) => r.id === (habit.group || "anytime"));
  if (!rit?.linkTask || ritualRunsThisWeek(items, rit.id, key, state.routinelog) < (Number(rit.linkTimes) || 3)) return;
  const t = read("work").tasks.find((x) => x.id === rit.linkTask);
  if (t && !t.done) docEdit("work", (w) => { const x = w.tasks.find((y) => y.id === t.id); if (x) x.done = key; });
}
const findRoutine = (id) => routineData().items.find((r) => r.id === id);

// ---------- timers ----------
let ticker = null;
function stopTimer() { clearInterval(ticker); ticker = null; state.timer = null; }
function startTimer(r) {
  stopTimer();
  state.timer = { id: r.id, key: state.date, end: Date.now() + r.minutes * 60_000 };
  ticker = setInterval(() => {
    const t = state.timer;
    if (!t) return stopTimer();
    if (Date.now() < t.end) return patchRoutines(ui.view);
    const done = findRoutine(t.id);
    stopTimer();
    if (done) {
      setCount(done.id, t.key, Math.min(target(done), doneCount(done, t.key, state.routinelog) + 1));
      try { if (Notification.permission === "granted") new Notification(`Time's up: ${done.name}`, { body: "Checked off. Nice work." }); } catch { /* not supported */ }
      navigator.vibrate?.([200, 100, 200]);
      if (state.run && ritualSteps(state.run.ritual)[state.run.index]?.id === done.id) state.run.index++;
    }
    render();
  }, 1000);
}

const STARTERS = {
  morning: ["morning", [["🛏️", "Make bed"], ["💧", "Glass of water"], ["🧘", "Stretch", 5]]],
  evening: ["evening", [["📝", "Plan tomorrow"], ["📵", "Screens off by bedtime"], ["📖", "Read", 15]]],
  work: ["afternoon", [["📥", "Clear inbox"], ["✍️", "Deep work block", 50], ["📣", "Post or pitch something"]], WEEKDAYS],
};

function saveRoutine() {
  const e = sheet("routine");
  e.name = String(e.name || "").trim();
  if (!e.name) return $("#r-name").focus(), "none";
  const clampNum = (v, lo, hi, dflt) => Math.max(lo, Math.min(hi, Number(v) || dflt));
  e.times = clampNum(e.times, 1, 20, 1); e.minutes = clampNum(e.minutes, 0, 240, 0);
  if (e.perWeek !== undefined) e.perWeek = clampNum(e.perWeek, 1, 7, 1);
  if (typeof e.icon === "string") e.icon = e.icon.trim();
  const mode = e.mode || modeOf(e);
  const r = { id: e.id || newId("r"), name: e.name, group: e.group || "morning", times: e.times || 1, since: e.since || todayKey() };
  if (e.icon) r.icon = e.icon;
  if (e.minutes) r.minutes = e.minutes;
  if (mode === "perweek") {
    r.perWeek = e.perWeek || 3;
    const max = Math.round(Number(e.perWeekMax) || 0);
    if (max > r.perWeek) r.perWeekMax = Math.min(7, max);
  }
  else r.days = mode === "weekdays" ? WEEKDAYS : mode === "days" ? (e.days?.length ? [...e.days].sort() : EVERY_DAY) : EVERY_DAY;
  editList((items) => {
    const at = items.findIndex((x) => x.id === r.id);
    if (at >= 0) items[at] = r; else items.push(r);
  });
  closeSheet();
}

export default {
  tabs: [["routines", "Rituals", routinesView], ["rsetup", "Set up habits & rituals", routineSetupView]],
  actions: {
    runStart(el) {
      const steps = ritualSteps(el.dataset.ritual);
      const first = steps.findIndex((r) => doneCount(r, state.date, state.routinelog) < target(r));
      state.run = { ritual: el.dataset.ritual, index: first < 0 ? steps.length : first };
    },
    runDone() {
      const step = ritualSteps(state.run.ritual)[state.run.index];
      if (step) { if (state.timer?.id === step.id) stopTimer(); setCount(step.id, state.date, target(step)); }
      state.run.index++;
    },
    runSkip() { if (state.timer) stopTimer(); state.run.index++; },
    runExit() { if (state.timer) stopTimer(); state.run = null; },
    ritNew() { openSheet("ritual", { custom: true }); },
    ritEdit(el) { openSheet("ritual", clone(routineData().rituals.find((r) => r.id === el.dataset.id))); },
    ritCancel: closeSheet,
    ritSave() {
      const { what, ...e } = sheet("ritual");
      e.name = String(e.name || "").trim();
      if (!e.name) return $("#rit-name").focus(), "none";
      editList((items, data) => {
        const rituals = data.rituals, at = rituals.findIndex((r) => r.id === e.id);
        const rit = { ...e, id: e.id || newId("rit"), icon: e.icon || "checklist" };
        if (!rit.linkGoal) { delete rit.linkGoal; delete rit.linkTask; delete rit.linkTimes; }
        else if (!rit.linkTask) { delete rit.linkTask; delete rit.linkTimes; }
        if (at >= 0) rituals[at] = rit; else rituals.push(rit);
      });
      closeSheet();
    },
    ritRemove() {
      const e = sheet("ritual");
      if (!confirm(`Delete the "${e.name}" ritual? Its steps move to Anytime.`)) return "none";
      editList((items, data) => {
        data.rituals = data.rituals.filter((r) => r.id !== e.id);
        items.forEach((r) => { if (r.group === e.id) r.group = "anytime"; });
      });
      closeSheet();
    },
    rToggle(el) {
      const r = findRoutine(el.dataset.id);
      if (!r) return "none";
      const n = doneCount(r, state.date, state.routinelog);
      return setCount(r.id, state.date, n >= target(r) ? 0 : target(r));
    },
    rCount(el) {
      const r = findRoutine(el.dataset.id);
      if (!r) return "none";
      const n = doneCount(r, state.date, state.routinelog);
      return setCount(r.id, state.date, n >= target(r) ? 0 : n + 1); // past the goal, a tap starts over
    },
    rTimer(el) {
      const r = findRoutine(el.dataset.id);
      if (!r || !isEditable(state.date)) return "none";
      if (state.timer?.id === r.id) stopTimer(); else startTimer(r);
    },
    rStarter(el) {
      const [group, list, days] = STARTERS[el.dataset.starter];
      const since = todayKey();
      editList((items) => list.forEach(([icon, name, minutes]) => items.push({
        id: newId("r"), name, icon, group, times: 1, since, days: days || EVERY_DAY, ...(minutes ? { minutes } : {}),
      })));
    },
    rNew() { openSheet("routine", { group: "morning", times: 1, mode: "daily" }); state.tab = "rsetup"; },
    rEdit(el) { openSheet("routine", clone(routineData().items[Number(el.dataset.index)])); },
    rCancel: closeSheet,
    rSave: saveRoutine,
    rMode(el) { sheet("routine").mode = el.dataset.mode; },
    rDay(el) {
      const e = sheet("routine"), d = Number(el.dataset.day);
      const days = new Set(e.days && e.days.length < 7 ? e.days : []);
      if (days.has(d)) days.delete(d); else days.add(d);
      e.days = [...days].sort();
    },
    rMove(el) {
      const i = Number(el.dataset.index), by = Number(el.dataset.by);
      editList((items) => {
        // Move past neighbours in other groups so the arrow always moves it within its own list.
        const group = items[i].group;
        let j = i + by;
        while (j >= 0 && j < items.length && items[j].group !== group) j += by;
        if (j >= 0 && j < items.length) [items[i], items[j]] = [items[j], items[i]];
      });
    },
    rRemove(el) {
      const r = routineData().items[Number(el.dataset.index)];
      if (!confirm(`Remove "${r.name}"?`)) return "none";
      editList((items) => items.splice(Number(el.dataset.index), 1));
    },
  },
  busy: () => Boolean(state.run),
  patch: (tab, view) => { if (tab === "routines") patchRoutines(view); },
};
