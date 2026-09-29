// Work: big goals broken into milestones and tasks, and a short list of what to do today. Private to each person.
// One doc, users/{uid}/lists/work:
//   goals:      [{ id, name, due }]
//   milestones: [{ id, goal, name, due }]
//   tasks:      [{ id, goal, ms, name, due, at, hours, spent, after, done, created }]
//               done = date finished, or ""; at = start time "HH:MM" (optional); spent = minutes on the timer
//   timer:      the one running or paused task timer (src/timer.js)
//   today:      { date, pins: [ids], skips: [ids], extra }                   resets each day
//   perDay:     how many tasks Today shows (3–5)
import { daysBetween } from "./util.js";

export function normalizeWork(doc) {
  return {
    goals: Array.isArray(doc?.goals) ? doc.goals : [],
    milestones: Array.isArray(doc?.milestones) ? doc.milestones : [],
    tasks: Array.isArray(doc?.tasks) ? doc.tasks : [],
    today: doc?.today || {},
    perDay: Math.min(5, Math.max(3, Number(doc?.perDay) || 3)),
    ...(doc?.timer ? { timer: doc.timer } : {}),
  };
}

export const todayState = (w, key) => (w.today?.date === key ? w.today : { date: key, pins: [], skips: [], extra: 0 });

// A task waits until the task it depends on is done.
export function blocker(t, tasks) {
  if (!t.after) return null;
  const b = tasks.find((x) => x.id === t.after);
  return b && !b.done ? b : null;
}

// Most urgent first: overdue, then soonest due, then undated, then oldest.
const urgency = (a, b) => (a.due || "9999").localeCompare(b.due || "9999") || String(a.created || "").localeCompare(String(b.created || ""));

// Today's list: pinned tasks and tasks with a start time due today, then the most urgent unblocked open tasks.
// Tasks finished today stay on the list (checked), so finishing doesn't pull in more until you ask.
// Anything with a start time goes to the top, earliest first.
export function todayPicks(w, key) {
  const t = todayState(w, key), size = w.perDay + (t.extra || 0);
  const doneToday = w.tasks.filter((x) => x.done === key);
  const open = w.tasks.filter((x) => !x.done && !blocker(x, w.tasks));
  const pinned = (t.pins || []).map((id) => open.find((x) => x.id === id)).filter(Boolean);
  const timed = open.filter((x) => x.at && x.due === key && !pinned.includes(x));
  const rest = open.filter((x) => !pinned.includes(x) && !timed.includes(x) && !(t.skips || []).includes(x.id)).sort(urgency);
  const picks = [...doneToday, ...pinned, ...timed];
  for (const x of rest) { if (picks.length >= size) break; picks.push(x); }
  return picks.map((x, i) => [x, i]).sort(([a, i], [b, j]) => (a.at || "99").localeCompare(b.at || "99") || i - j).map(([x]) => x);
}

// Progress for a set of tasks. Behind = anything overdue.
export function progress(tasks, key) {
  const total = tasks.length, done = tasks.filter((x) => x.done).length;
  const overdue = tasks.filter((x) => !x.done && x.due && x.due < key).length;
  const hoursLeft = tasks.filter((x) => !x.done).reduce((s, x) => s + (Number(x.hours) || 0), 0);
  const spent = tasks.reduce((s, x) => s + (Number(x.spent) || 0), 0);
  return { total, done, pct: total ? Math.round((100 * done) / total) : 0, overdue, hoursLeft, spent };
}

export const daysLeft = (due, key) => (due ? daysBetween(key, due) : null);

export function countdown(due, key) {
  const n = daysLeft(due, key);
  if (n === null) return "No deadline";
  if (n < 0) return `${-n} day${n === -1 ? "" : "s"} past due`;
  if (n === 0) return "Due today";
  if (n === 1) return "Due tomorrow";
  if (n < 60) return `${n} days left`;
  return `${Math.round(n / 7)} weeks left`;
}

// Removing a task frees anything that waited on it.
export function removeTask(w, id) {
  w.tasks = w.tasks.filter((x) => x.id !== id);
  w.tasks.forEach((x) => { if (x.after === id) delete x.after; });
}
export function removeMilestone(w, id) {
  w.tasks.filter((x) => x.ms === id).forEach((x) => removeTask(w, x.id));
  w.milestones = w.milestones.filter((m) => m.id !== id);
}
export function removeGoal(w, id) {
  w.tasks.filter((x) => x.goal === id).forEach((x) => removeTask(w, x.id));
  w.milestones = w.milestones.filter((m) => m.goal !== id);
  w.goals = w.goals.filter((g) => g.id !== id);
}

// Each goal gets its own colour, in order, so its tasks are easy to spot everywhere.
export const GOAL_THEMES = ["tide", "rose", "garden", "sun", "dusk", "teal", "ember"];
export const goalTheme = (w, goalId) => {
  const i = w.goals.findIndex((g) => g.id === goalId);
  return i < 0 ? "ember" : GOAL_THEMES[i % GOAL_THEMES.length];
};
