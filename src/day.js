// Editing my own days, and publishing the numbers the group is allowed to see.
import { state, settings, isEditable, myFreezes } from "./state.js";
import { scoreDay } from "./scoring.js";
import { bonusOn } from "./ladder.js";
import { MAX_DAILY_BONUS } from "./constants.js";
import { save, paths } from "./store.js";
import { clone, todayKey } from "./util.js";

export function dayFor(key) {
  state.days[key] ??= { date: key, a: {} };
  const day = state.days[key];
  day.a ??= {};
  day.a.c ??= {};
  day.a.sessions ??= [];
  day.a.ex ??= {};
  return day;
}
export const answers = (key = state.date) => dayFor(key).a;

// Records which questions and targets this day is scored with.
function stamp(day) {
  const s = settings();
  day.logged = true;
  day.updated = Date.now();
  day.cfg = { cats: clone(s.cats), lead: s.lead || null, floor: [...s.floor], targets: clone(s.targets) };
}

// Only numbers and flags leave this device; the rules reject anything else.
function publishScore(key) {
  const day = state.days[key];
  const r = scoreDay(day, settings());
  const doc = { uid: state.uid, date: key, total: r.total, logged: r.logged, showed: r.showedUp, streak: r.streakDay, updated: Date.now() };
  if (r.logged && day?.a?.doneAt) doc.doneAt = day.a.doneAt;
  const { bonus, levelUp } = r.logged ? bonusOn(key, settings().cats, state.days) : { bonus: 0 };
  if (bonus) doc.bonus = Math.min(MAX_DAILY_BONUS, bonus);
  if (levelUp) doc.levelUp = true;
  state.scores[`${state.uid}_${key}`] = doc;
  save(paths.score(state.uid, key), doc);
}

export function commitDay(key = state.date) {
  if (!isEditable(key)) return false;
  const day = dayFor(key);
  stamp(day);
  save(paths.day(state.uid, key), day);
  publishScore(key);
  syncFreezes();
  return true;
}

// After question/target edits, today's score should reflect the new setup.
function restampToday() {
  const key = todayKey();
  if (state.days[key]?.logged) commitDay(key);
}

export function saveSettings() {
  save(paths.settings(state.uid), settings(), 600);
  restampToday();
}

export function memberDoc() {
  const m = state.members[state.uid] || {};
  const doc = { uid: state.uid, name: m.name || state.userName || "Member", joined: m.joined || todayKey(), freezes: myFreezes(), updated: Date.now() };
  if (m.display) doc.display = m.display;
  return doc;
}

export function saveMember(delay = 900) {
  const doc = memberDoc();
  state.members[state.uid] = doc;
  save(paths.member(state.uid), doc, delay);
}

function syncFreezes() {
  const m = state.members[state.uid];
  if (m && Number(m.freezes || 0) !== myFreezes()) saveMember(1500);
}
