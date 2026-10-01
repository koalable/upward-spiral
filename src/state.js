// App state, plus read-only questions about it (selectors).
import {
  HISTORY_DAYS, SEASON_DAYS, SEASON_BREAK_DAYS, MAX_FREEZES, YESTERDAY_CUTOFF_HOUR,
} from "./constants.js";
import { normalizeSettings, scoredQuestions, questionName, scoreDay } from "./scoring.js";
import { todayKey, addDays, dateRange, daysBetween, parseKey, toNum } from "./util.js";

export const state = {
  // who
  uid: null, authUid: null, email: "", userName: "", preview: false, linkedTo: "", aliases: null,
  // what's on screen
  route: { tab: "" }, date: todayKey(), board: "week",
  // data (shared)
  members: {}, scores: {}, wins: {}, season: null,
  // data (private to this person)
  settings: null, days: {}, weekly: {}, medlog: {}, routines: null, routinelog: {}, work: null, notify: null, todos: null,
  // what's open: one form, card or sheet at a time (see sheet() below), plus a few status messages
  sheet: null, workImport: "", run: null, toast: null, timer: null,
  area: "checkins", calMonth: null, pushStatus: "",
  loaded: false,
  historyStart: addDays(todayKey(), -HISTORY_DAYS),
};

// Where you are: state.route = { tab, goal?, ms? } (see route.js). state.tab reads and sets just the tab;
// setting it leaves any goal page.
Object.defineProperty(state, "tab", { get: () => state.route.tab, set: (tab) => { state.route = { tab }; }, enumerable: true });

// ---------- what's open ----------
// One thing open at a time: { what: "work" | "question" | "med" | "log" | "routine" | "ritual" | "todo" | "task" | "breath" | "tidy", ...draft }.
// Form fields marked data-draft="key" write into it as you type (features/core.js), so nothing is read back off the screen.
export const sheet = (what) => (state.sheet?.what === what ? state.sheet : null);
export const openSheet = (what, draft = {}) => { state.sheet = { ...draft, what }; return state.sheet; };
export const closeSheet = () => { state.sheet = null; };
// Forms (as opposed to cards and sheets): while one is open, remote changes don't redraw the screen.
export const FORMS = ["work", "question", "med", "log", "routine", "ritual", "todo", "meal", "bulk"];
export const formOpen = () => FORMS.includes(state.sheet?.what);

// ---------- my settings ----------
export const settings = () => (state.settings = normalizeSettings(state.settings));
export const targets = () => settings().targets;
export const hasQuestion = (id) => settings().cats.some((q) => q.id === id);
export const hasBuiltin = (id) => settings().cats.some((q) => q.id === id && q.kind === "builtin");
export const findQuestion = (id, cfg = settings()) => cfg.cats.find((q) => q.id === id);

export function leadName(cfg = settings()) {
  const lead = scoredQuestions(cfg).find((q) => q.id === cfg.lead);
  return lead ? questionName(lead) : "Check-in";
}
export function floorNames(cfg = settings()) {
  const scored = new Set(scoredQuestions(cfg).map((q) => q.id));
  const names = cfg.floor.filter((id) => scored.has(id)).map((id) => questionName(findQuestion(id, cfg)));
  return names.length ? names.join(", ") : leadName(cfg);
}

// ---------- my days ----------
export function isEditable(key) {
  const today = todayKey();
  return key === today || (key === addDays(today, -1) && new Date().getHours() < YESTERDAY_CUTOFF_HOUR);
}
export const scoreOf = (key) => scoreDay(state.days[key], settings());

// ---------- shared scores (anyone in the group) ----------
export const sharedScore = (uid, key) => state.scores[`${uid}_${key}`];
export const dayBonus = (uid, key) => toNum(sharedScore(uid, key)?.bonus);
export const dayTotal = (uid, key) => toNum(sharedScore(uid, key)?.total) + dayBonus(uid, key); // daily score plus any bonus
export const isStreakDay = (uid, key) => Boolean(sharedScore(uid, key)?.streak);
export const showedUp = (uid, key) => Boolean(sharedScore(uid, key)?.showed);
export const checkedIn = (uid, key) => Boolean(sharedScore(uid, key)?.logged);
export const joinedBy = (uid, key) => (state.members[uid]?.joined || "9999") <= key;
export const memberName = (uid) => state.members[uid]?.display || state.members[uid]?.name || "Member";

export function sumPoints(uid, dates) {
  const today = todayKey();
  return dates.reduce((sum, d) => (d > today ? sum : sum + dayTotal(uid, d)), 0);
}

export function currentStreak(uid) {
  let d = todayKey();
  if (!isStreakDay(uid, d)) d = addDays(d, -1); // today isn't over yet
  let n = 0;
  while (d >= state.historyStart && isStreakDay(uid, d)) { n++; d = addDays(d, -1); }
  return { days: n, capped: d < state.historyStart };
}

export function longestStreak(uid) {
  let best = 0, run = 0;
  for (const d of dateRange(state.historyStart, todayKey())) {
    run = isStreakDay(uid, d) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

// ---------- seasons and freezes ----------
export function currentSeason() {
  const s = state.season;
  if (!s?.start) return null;
  const end = addDays(s.start, SEASON_DAYS - 1);
  const breakEnd = addDays(end, SEASON_BREAK_DAYS);
  const today = todayKey();
  const season = { n: s.n || 1, start: s.start, end, breakEnd };
  if (today < s.start) return { ...season, phase: "upcoming" };
  if (today <= end) return { ...season, phase: "active", week: Math.floor(daysBetween(s.start, today) / 7) + 1 };
  return { ...season, phase: today <= breakEnd ? "break" : "over" };
}

export const seasonDays = (s = currentSeason()) => (s ? dateRange(s.start, s.end < todayKey() ? s.end : todayKey()) : []);

// A freeze is earned each Monday for hitting last week's points goal, and spent on a freeze day.
export function myFreezes() {
  const season = currentSeason();
  if (!season || season.phase === "upcoming") return 0;
  const goal = toNum(targets().weekPts);
  let bank = 0;
  for (const d of seasonDays(season)) {
    const isMonday = parseKey(d).getDay() === 1;
    if (d !== season.start && isMonday && goal > 0 && sumPoints(state.uid, dateRange(addDays(d, -7), addDays(d, -1))) >= goal) {
      bank = Math.min(MAX_FREEZES, bank + 1);
    }
    if (state.days[d]?.a?.freeze) bank = Math.max(0, bank - 1);
  }
  return bank;
}
export const freezesOf = (uid) => (uid === state.uid ? myFreezes() : toNum(state.members[uid]?.freezes));
