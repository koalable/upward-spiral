// The daily check-in: answering questions, editing my questions, level-ups, journal, and targets.
import { state, settings, targets, isEditable, findQuestion } from "../state.js";
import { answers, commitDay, saveSettings, saveMember } from "../day.js";
import { builtinAsCustom, scoredQuestions } from "../scoring.js";
import { clone, getPath, setPath, isSet, toNum, todayKey, newId } from "../util.js";
import { ui, render, patch } from "../render.js";
import { store, paths } from "../store.js";
import { isLadder, ladderStatus, levelOf } from "../ladder.js";
import { LADDER_TEMPLATES, DEFAULT_WEEKS_TO_LEVEL } from "../constants.js";
import { todayView, patchToday } from "../views/today.js";
import { reflectView, filterJournal } from "../views/journal.js";
import { customizeView, accountView } from "../views/settings.js";
import { normalizeLayout, applyPreset, toggleIn } from "../layout.js";
import { suggest, newBreathing, pauseFor, itemKey } from "../breathing.js";
import { pausable } from "../views/breathing.js";
import { weekStart } from "../util.js";
import { questionsView, readQuestionForm } from "../views/questions.js";
import { targetsView, reminderLink, reminderOpts } from "../views/targets.js";
import { openIcs } from "../calendar.js";

const $ = (sel) => ui.view.querySelector(sel);

function answer(fn) {
  if (!isEditable(state.date)) return "none";
  fn(answers());
  commitDay();
  return "patch";
}

function addSession(minutes) {
  if (!isEditable(state.date)) return "none";
  const note = $("#wNote")?.value.trim();
  answers().sessions.push({ m: minutes, at: Date.now(), ...(note ? { note } : {}) });
  commitDay();
}

// ---------- my questions ----------
function tidyStreakAndFloor() {
  const s = settings();
  const scored = scoredQuestions(s).map((q) => q.id);
  if (s.lead && !scored.includes(s.lead)) s.lead = scored[0] || null;
  s.floor = s.floor.filter((id) => scored.includes(id));
  saveSettings();
}

function saveQuestion() {
  readQuestionForm(ui.view);
  const e = state.editQuestion;
  if (!e.name) return $("#q-name").focus(), "none";
  if (e.kind === "check" && !e.items?.length) return $("#q-items").focus(), "none";
  if (e.kind === "number" && e.scored !== false && !isSet(e.target)) return $("#q-target").focus(), "none";
  if (e.kind === "ladder" && !e.levels?.length) return $("#q-levels").focus(), "none";

  const q = { id: e.id || newId("q"), kind: e.kind, name: e.name, scored: e.kind !== "text" && e.scored !== false };
  if (e.origin) q.origin = "builtin";
  if (e.group) q.group = e.group;
  if (e.kind === "check") q.items = e.items;
  if (e.kind === "ladder") {
    Object.assign(q, {
      scored: false, mode: e.mode === "minutes" ? "minutes" : "days", levels: e.levels,
      weeksToLevel: e.weeksToLevel || DEFAULT_WEEKS_TO_LEVEL,
      level: levelOf({ levels: e.levels }, e.level || 0).index,
      levelSince: e.levelSince || todayKey(), history: e.history || [],
    });
    if (e.stayedAt !== undefined) q.stayedAt = e.stayedAt;
  }
  if (e.kind === "number") Object.assign(q, { unit: e.unit || "", dir: e.dir === "max" ? "max" : "min", target: toNum(e.target), step: toNum(e.step) || 1 });

  const cats = settings().cats, at = cats.findIndex((x) => x.id === q.id);
  if (at >= 0) cats[at] = q; else cats.push(q);
  state.editQuestion = null;
  tidyStreakAndFloor();
}

async function loadAliases() {
  const all = await store().find("aliases", ["uid", "==", state.uid]).catch(() => ({}));
  state.aliases = all;
  render();
}

// Customize: presets and on/off switches. Names and icons are saved as you type (see input/change below).
const editLayout = (fn) => { settings().layout = fn(normalizeLayout(settings().layout)); saveSettings(); };

// Breathing room: a draft while the sheet is open, saved into settings.breathing.
const draft = () => state.breath;
const toggleItem = (list, x) => (list.some((y) => itemKey(y) === itemKey(x)) ? list.filter((y) => itemKey(y) !== itemKey(x)) : [...list, x]);

const actions = {
  brOpen() {
    const b = pauseFor(settings(), todayKey());
    state.breath = b ? { level: "", items: [...b.items, ...b.tiny], tiny: [...b.tiny], why: b.why, note: b.note, makeUp: b.makeUp }
      : { level: "", items: [], tiny: [], why: "", note: "", makeUp: 3 };
  },
  brCancel() { state.breath = null; },
  brLevel(el) { Object.assign(draft(), { level: el.dataset.level, items: suggest(el.dataset.level, pausable()), tiny: [] }); },
  brItem(el) {
    const x = { kind: el.dataset.kind, id: el.dataset.id };
    draft().items = toggleItem(draft().items, x);
    draft().tiny = draft().tiny.filter((y) => draft().items.some((z) => itemKey(z) === itemKey(y)));
  },
  brTiny(el) { draft().tiny = toggleItem(draft().tiny, { kind: el.dataset.kind, id: el.dataset.id }); },
  brWhy(el) { draft().why = draft().why === el.dataset.why ? "" : el.dataset.why; },
  brMakeUp(el) { draft().makeUp = Number(el.dataset.n); },
  brSave() {
    const s = settings(), week = weekStart(todayKey());
    s.breathing = [...(s.breathing || []).filter((b) => b.week !== week), newBreathing(draft(), todayKey(), `br${Date.now().toString(36)}`)];
    state.breath = null;
    saveSettings();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },
  brEnd() {
    if (!confirm("End this week's breathing room? Everything comes back today.")) return "none";
    const s = settings(), week = weekStart(todayKey());
    s.breathing = (s.breathing || []).filter((b) => b.week !== week);
    saveSettings();
  },
  layoutPreset: (el) => editLayout((l) => applyPreset(l, el.dataset.preset)),
  layoutToggle: (el) => editLayout((l) => toggleIn(l, el.dataset.key, el.dataset.id)),
  linkAccount() {
    const email = ($("#link-email")?.value || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email === (state.email || "").toLowerCase()) return $("#link-email")?.focus(), "none";
    state.linkMsg = "Linking…";
    store().set(paths.alias(email), { uid: state.uid, at: Date.now() })
      .then(() => { state.linkMsg = `Linked. Sign in with ${email} to use it.`; return loadAliases(); })
      .catch(() => { state.linkMsg = "Couldn't link that email. Is it on the challenge list?"; render(); });
  },
  unlinkAccount(el) {
    store().remove(paths.alias(el.dataset.email)).then(loadAliases, loadAliases);
    return "none";
  },
  // tapping a ring's tab jumps to that group's questions (Show up → today's to-dos and Work)
  jumpGroup(el) {
    const target = $(`#grp-${el.dataset.group}`) || (el.dataset.group === "show" ? $("#live-dash") || $("#live-finish") : null);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    return "none";
  },
  icsReminder: () => (openIcs(reminderOpts(settings().targets)), "none"),
  // answering
  toggle: (el) => answer((a) => {
    const on = !getPath(a, el.dataset.answer);
    setPath(a, el.dataset.answer, on);
    el.setAttribute("aria-pressed", String(on));
    el.querySelector(".box").textContent = on ? "✓" : "";
  }),
  choose: (el) => answer((a) => {
    setPath(a, el.dataset.answer, Number(el.dataset.value));
    for (const b of el.parentElement.children) b.setAttribute("aria-pressed", String(b === el));
  }),
  step: (el) => answer((a) => {
    const path = el.dataset.answer, by = Number(el.dataset.by), current = getPath(a, path);
    const value = isSet(current) ? Math.max(0, Math.round((toNum(current) + by) * 100) / 100) : Math.max(0, by);
    setPath(a, path, value);
    const input = ui.view.querySelector(`input[data-answer="${path}"]`);
    if (input) input.value = value;
  }),
  addSession: (el) => addSession(Number(el.dataset.minutes)),
  addCustomSession() {
    const minutes = Number($("#wCustom").value);
    if (minutes > 0) return addSession(minutes);
    $("#wCustom").focus();
    return "none";
  },
  removeSession(el) {
    if (!isEditable(state.date)) return "none";
    answers().sessions.splice(Number(el.dataset.index), 1);
    commitDay();
  },
  finish: () => answer((a) => { a.doneAt = Date.now(); }),
  unfinish: () => answer((a) => { delete a.doneAt; }),

  // level-up habits
  levelUp(el) {
    const q = findQuestion(el.dataset.id);
    if (!isLadder(q)) return "none";
    const s = ladderStatus(q, state.days);
    q.history = [...(q.history || []), { level: levelOf(q).index, on: s.completedOn || todayKey() }];
    q.level = Math.min(levelOf(q).count - 1, levelOf(q).index + 1);
    q.levelSince = todayKey();
    delete q.stayedAt;
    saveSettings();
  },
  stayLevel(el) {
    const q = findQuestion(el.dataset.id);
    if (!isLadder(q)) return "none";
    q.stayedAt = levelOf(q).index;
    saveSettings();
  },

  // my questions
  qNew() { state.editQuestion = { kind: "check", scored: true, items: [] }; },
  qEdit(el) {
    const q = settings().cats[Number(el.dataset.index)];
    state.editQuestion = q.kind === "builtin" ? builtinAsCustom(q.id, targets()) : clone(q);
  },
  qCancel() { state.editQuestion = null; },
  qTemplate(el) {
    readQuestionForm(ui.view);
    const t = LADDER_TEMPLATES[el.dataset.template];
    state.editQuestion = { ...state.editQuestion, kind: "ladder", name: state.editQuestion.name || t.name, mode: t.mode, levels: clone(t.levels) };
  },
  qSave: saveQuestion,
  qRevert() {
    const cats = settings().cats, i = cats.findIndex((q) => q.id === state.editQuestion.id);
    if (i >= 0) cats[i] = { id: state.editQuestion.id, kind: "builtin", scored: true };
    state.editQuestion = null;
    tidyStreakAndFloor();
  },
  qMove(el) {
    const cats = settings().cats, i = Number(el.dataset.index), j = i + Number(el.dataset.by);
    if (j < 0 || j >= cats.length) return "none";
    [cats[i], cats[j]] = [cats[j], cats[i]];
    saveSettings();
  },
  qRemove(el) {
    const cats = settings().cats, q = cats[Number(el.dataset.index)];
    if (q.kind !== "builtin" && !confirm(`Remove "${q.name}"? Past answers stay in your history.`)) return "none";
    cats.splice(Number(el.dataset.index), 1);
    tidyStreakAndFloor();
  },
  qAddBuiltin(el) {
    if (!findQuestion(el.dataset.id)) settings().cats.push({ id: el.dataset.id, kind: "builtin", scored: true });
    saveSettings();
  },
};

export default {
  tabs: [
    ["today", "Today", todayView],
    ["reflect", "Reflect", reflectView],
    ["customize", "Customize", customizeView],
    ["setup", "Categories", questionsView],
    ["targets", "Targets & scoring", targetsView],
    ["account", "Account", accountView],
  ],
  actions,
  liveTab: (tab) => tab === "today",
  data(name) { if (name === "loaded" && !state.preview && !state.linkedTo) loadAliases(); },
  busy: () => Boolean(state.editQuestion),
  leave: (tab, view) => { if (tab === "setup") readQuestionForm(view); },
  patch: (tab, view) => { if (tab === "today") patchToday(view); },

  input(el) {
    const d = el.dataset;
    if ("search" in d) return filterJournal(ui.view, el.value), true;
    if ("brNote" in d) { if (state.breath) state.breath.note = el.value; return true; }
    if (d.layoutName) {
      const l = normalizeLayout(settings().layout);
      l.names[d.layoutName] = el.value.slice(0, 16);
      settings().layout = l; saveSettings();
      const chip = document.querySelector(`nav.pages [data-page="${d.layoutName}"] span`);
      if (chip) chip.textContent = el.value.trim() || "Work";
      return true;
    }
    if (d.answer) {
      if (!isEditable(state.date)) return true;
      const value = el.value === "" ? undefined : el.type === "number" ? Math.max(0, Number(el.value)) : el.value;
      setPath(answers(), d.answer, value);
      commitDay();
      return patch(), true;
    }
    if (d.target) {
      const t = settings().targets;
      t[d.target] = el.type === "number" ? Math.max(0, toNum(el.value)) : el.value;
      const link = ui.view.querySelector("#reminder-link");
      if (link) link.href = reminderLink(t);
      return saveSettings(), true;
    }
    if ("display" in d) {
      const me = state.members[state.uid];
      if (me) { me.display = el.value.trim() || undefined; saveMember(); }
      return true;
    }
    return false;
  },

  change(el) {
    const d = el.dataset;
    if (d.layoutIcon) return editLayout((l) => ({ ...l, icons: { ...l.icons, [d.layoutIcon]: el.value } })), render(), true;
    if (el.id === "q-kind" || el.id === "q-mode") return readQuestionForm(ui.view), render(), true;
    if (el.id === "q-lead") return (settings().lead = el.value || null), saveSettings(), render(), true;
    if (d.floor) {
      const s = settings();
      s.floor = s.floor.filter((id) => id !== d.floor);
      if (el.checked) s.floor.push(d.floor);
      return saveSettings(), true;
    }
    return false;
  },

  keydown(event) {
    const el = event.target;
    if (event.key !== "Enter" || (el.id !== "wCustom" && el.id !== "wNote")) return false;
    if (actions.addCustomSession() !== "none") render();
    return true;
  },
};
