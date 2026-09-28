// Work: check off today's tasks, pin or swap them, and manage goals, milestones and tasks.
import { state } from "../state.js";
import { save, paths } from "../store.js";
import { clone, newId, todayKey } from "../util.js";
import { ui } from "../render.js";
import { todayState, removeTask, removeMilestone, removeGoal } from "../work.js";
import { workTodayView, workGoalsView, workData, readWorkForm } from "../views/work.js";
import { parsePlan, PLAN_PROMPT } from "../workimport.js";

const LIST = { goal: "goals", ms: "milestones", task: "tasks" };

function edit(fn) {
  const w = clone(workData());
  fn(w);
  state.work = w;
  save(paths.work(state.uid), w, 400);
}
const editToday = (fn) => edit((w) => { w.today = clone(todayState(w, state.date)); fn(w.today); });

function saveItem() {
  readWorkForm(ui.view);
  const e = state.editWork;
  if (!e.name) return ui.view.querySelector("#w-name").focus(), "none";
  const item = { id: e.id || newId(e.kind === "ms" ? "m" : e.kind[0]), name: e.name, due: e.due || "" };
  if (e.kind !== "goal") item.goal = e.goal;
  if (e.kind === "task") Object.assign(item, { ms: e.ms || "", hours: e.hours || "", after: e.after || "", done: e.done || "", created: e.created || Date.now() });
  edit((w) => {
    const list = w[LIST[e.kind]], at = list.findIndex((x) => x.id === item.id);
    if (at >= 0) list[at] = item; else list.push(item);
  });
  state.editWork = null;
}

export default {
  tabs: [["wtoday", "Today", workTodayView], ["wgoals", "Goals", workGoalsView]],
  actions: {
    wToggle(el) {
      edit((w) => {
        const t = w.tasks.find((x) => x.id === el.dataset.id);
        if (t) t.done = t.done ? "" : state.date;
      });
    },
    wPin(el) {
      const id = el.dataset.id;
      editToday((t) => { t.pins = t.pins?.includes(id) ? t.pins.filter((x) => x !== id) : [...(t.pins || []), id]; });
    },
    wSwap(el) { editToday((t) => { t.skips = [...(t.skips || []), el.dataset.id]; }); },
    wMore() { editToday((t) => { t.extra = (t.extra || 0) + 1; }); },
    wPerDay(el) { edit((w) => { w.perDay = Number(el.dataset.n); }); },
    wNew(el) {
      const d = el.dataset;
      state.editWork = { kind: d.kind, goal: d.goal, ms: d.ms || "" };
      state.tab = "wgoals";
      setTimeout(() => { ui.view.querySelector("#wform")?.scrollIntoView({ behavior: "smooth", block: "start" }); ui.view.querySelector("#w-name")?.focus(); }, 0);
    },
    wEdit(el) {
      const { kind, id } = el.dataset;
      state.editWork = { kind, ...clone(workData()[LIST[kind]].find((x) => x.id === id)) };
      setTimeout(() => ui.view.querySelector("#wform")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    },
    wCancel() { state.editWork = null; },
    wSave: saveItem,
    wCopyPrompt(el) {
      navigator.clipboard?.writeText(PLAN_PROMPT).then(() => { el.querySelector("span").textContent = "Copied"; }, () => {});
      return "none";
    },
    wImport() {
      const text = ui.view.querySelector("#w-import")?.value || "";
      const p = parsePlan(text, newId);
      if (!p.goals.length) { state.workImport = "Nothing to import. Each plan needs a line starting with GOAL:"; return; }
      edit((w) => { w.goals.push(...p.goals); w.milestones.push(...p.milestones); w.tasks.push(...p.tasks); });
      const n = (k, word) => `${k} ${word}${k === 1 ? "" : "s"}`;
      state.workImport = `Imported ${n(p.goals.length, "goal")}, ${n(p.milestones.length, "milestone")} and ${n(p.tasks.length, "task")}.`
        + (p.skipped.length ? ` Skipped ${p.skipped.length} line${p.skipped.length === 1 ? "" : "s"}: ${p.skipped.slice(0, 3).join(" · ")}${p.skipped.length > 3 ? " …" : ""}` : "");
    },
    wRemove() {
      const e = state.editWork;
      const warn = e.kind === "goal" ? " and all its milestones and tasks" : e.kind === "ms" ? " and its tasks" : "";
      if (!confirm(`Delete "${e.name}"${warn}?`)) return "none";
      edit((w) => (e.kind === "goal" ? removeGoal : e.kind === "ms" ? removeMilestone : removeTask)(w, e.id));
      state.editWork = null;
    },
  },
  leave() { readWorkForm(ui.view); },
  busy: () => Boolean(state.editWork),
  midnight() { state.date = todayKey(); },
};
