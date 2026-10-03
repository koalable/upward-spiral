// Routines: recurring tasks grouped by time of day. Private to each person.
// A routine: { id, name, icon, group, days: [0–6] (0 = Sunday) | perWeek: n (+ perWeekMax for "3–4×"), times, minutes, since }
// The log keeps one doc per day: { date, done: { [routineId]: count } }.
import { toNum, parseKey, weekOf, addDays, weekStart, daysBetween } from "./util.js";

// Rituals are ordered sets of routines you run through one step at a time.
// The first four always exist; people can add their own (e.g. "Workday shutdown").
export const DEFAULT_RITUALS = [
  { id: "morning", name: "Morning", time: "07:00", icon: "wb_sunny" },
  { id: "afternoon", name: "Afternoon", time: "13:00", icon: "light_mode" },
  { id: "evening", name: "Evening", time: "20:00", icon: "bedtime" },
  { id: "anytime", name: "Anytime", time: "", icon: "all_inclusive" },
];
export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS = [1, 2, 3, 4, 5];
export const DAY_LETTERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function normalizeRoutines(doc) {
  const saved = Array.isArray(doc?.rituals) ? doc.rituals : [];
  const oldTimes = doc?.groupTimes || {}; // from before rituals existed
  const rituals = DEFAULT_RITUALS.map((d) => ({ ...d, ...(oldTimes[d.id] ? { time: oldTimes[d.id] } : {}), ...(saved.find((r) => r.id === d.id) || {}) }));
  for (const r of saved) if (!rituals.some((x) => x.id === r.id)) rituals.push(r);
  return { items: Array.isArray(doc?.items) ? doc.items : [], rituals };
}
export const inRitual = (items, id) => items.filter((r) => (r.group || "anytime") === id);

export const doneCount = (r, key, log) => toNum(log[key]?.done?.[r.id]);
export const target = (r) => Math.max(1, toNum(r.times) || 1);
export const isDone = (r, key, log) => doneCount(r, key, log) >= target(r);

export function scheduleLabel(r) {
  if (r.perWeek) return `${r.perWeek}${r.perWeekMax > r.perWeek ? `–${r.perWeekMax}` : ""}× a week`;
  const days = [...(r.days || EVERY_DAY)].sort();
  if (days.length === 7) return "Every day";
  if (days.join() === WEEKDAYS.join()) return "Weekdays";
  if (days.join() === "0,6") return "Weekends";
  return days.map((d) => DAY_LETTERS[d]).join(" ");
}

// Days this week (through `key`) on which the routine was fully done.
export const doneThisWeek = (r, key, log) => weekOf(key).filter((d) => d <= key && isDone(r, d, log)).length;

// Scheduled on this date? A "3× a week" routine is open every day until the week's quota is met.
export function isScheduled(r, key, log) {
  if (r.since && key < r.since) return false;
  if (r.perWeek) return isDone(r, key, log) || doneThisWeek(r, key, log) < r.perWeek;
  return (r.days || EVERY_DAY).includes(parseKey(key).getDay());
}

// How a group of routines went on one day, for the streak calendars.
// Fixed-day routines count when scheduled; "× a week" routines only count on days they were done,
// so a flexible routine never spoils a day. Returns null when nothing was due.
export function dayStatus(routines, key, log) {
  let due = 0, done = 0;
  for (const r of routines) {
    if (r.since && key < r.since) continue;
    const finished = isDone(r, key, log);
    if (r.perWeek ? !finished : !(r.days || EVERY_DAY).includes(parseKey(key).getDay())) continue;
    due++;
    if (finished) done++;
  }
  if (!due) return null;
  return done === due ? "all" : done > 0 ? "some" : "none";
}

// Pace for a "× a week" routine (e.g. showering 3–4× a week): how many are done this week, how long since the
// last one, and whether it's due today: not done today, still short of the week's number, and either it's been
// a while (7 ÷ times a week, rounded down: 2 days for 3×) or there are only just enough days left in the week.
export function pace(r, key, log) {
  if (!r.perWeek) return null;
  const done = doneThisWeek(r, key, log), need = Math.max(0, r.perWeek - done);
  let last = null;
  for (let n = 0; n <= 14; n++) { const d = addDays(key, -n); if (isDone(r, d, log)) { last = n; break; } }
  const daysLeft = daysBetween(key, addDays(weekStart(key), 6)) + 1; // today through Sunday
  const gap = Math.max(1, Math.floor(7 / r.perWeek));
  const today = last === 0;
  const due = !today && need > 0 && (last === null || last >= gap || need >= daysLeft);
  return { done, need, of: r.perWeek, last, due, behind: need >= daysLeft };
}

export const lastLabel = (n) => (n === null ? "not yet" : n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`);

// A ritual "ran" on a day when every step due that day was done.
// Steps on a few-times-a-week schedule count too (unlike dayStatus), so doing half the ritual isn't a run.
export function ritualRan(items, ritId, key, log) {
  const due = inRitual(items, ritId).filter((r) => !(r.since && key < r.since) && (r.perWeek || (r.days || EVERY_DAY).includes(parseKey(key).getDay())));
  return due.length > 0 && due.every((r) => isDone(r, key, log));
}
// How many days this week (Mon → key) the ritual ran.
export const ritualRunsThisWeek = (items, ritId, key, log) => weekOf(key).filter((d) => d <= key && ritualRan(items, ritId, d, log)).length;
