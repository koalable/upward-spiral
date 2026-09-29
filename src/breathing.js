// Breathing room: pause any mix of check-in categories, habits and Work goals for the rest of this week.
// Everything is either on track, late, or restarting after a break. Pure: data in, answers out.
// Kept in the settings doc:
//   breathing: [{ id, week (Monday key), items: [{ kind: "cat"|"habit"|"goal", id }], tiny: [same],
//                 why, note, moved: [goal ids whose tasks due this week moved to next week], created }]
// Paused = off the list this week, shown as "paused" rather than missed. Tiny = still on, but a small version counts.
import { addDays, weekStart } from "./util.js";

export const WHYS = [["travel", "Travelling"], ["sick", "Sick or run down"], ["overloaded", "Too much on"], ["hard", "A hard week"], ["rest", "I need rest"], ["other", "Something else"]];
export const LEVELS = [
  ["little", "A little", "One or two things off the list."],
  ["some", "Some", "The stretch goals get a week off."],
  ["lot", "A lot", "Just the basics this week."],
];
// The basics never pause: meds aren't on this list at all, and sleep and diet stay unless you pick them.
const BASICS = new Set(["sleep", "diet"]);
const STRETCH = new Set(["writing", "reading", "movement", "practices"]);

export const itemKey = (x) => `${x.kind}:${x.id}`;
const has = (list, kind, id) => (list || []).some((x) => x.kind === kind && x.id === id);

// The breathing room covering a date (its week), if any.
export const pauseFor = (s, date) => (s?.breathing || []).find((b) => b.week === weekStart(date)) || null;
export const isPaused = (s, kind, id, date) => has(pauseFor(s, date)?.items, kind, id);
export const isTiny = (s, kind, id, date) => has(pauseFor(s, date)?.tiny, kind, id);

// The week after a breathing room: what's restarting after the break.
export function restartFor(s, date) {
  const prev = addDays(weekStart(date), -7);
  return (s?.breathing || []).find((b) => b.week === prev && b.items?.length) || null;
}
export const restartDate = (today) => addDays(weekStart(today), 7);

// Suggested picks for each level; you can change them before saving.
export function suggest(level, { cats = [], habits = [], goals = [] }) {
  if (level === "little") return [];
  const catPick = cats.filter((q) => (level === "lot" ? !BASICS.has(q.id) : STRETCH.has(q.id) || q.kind === "ladder"));
  const habitPick = level === "lot" ? habits : habits.filter((h) => (h.minutes || 0) >= 20);
  const goalPick = level === "lot" ? goals : [];
  return [...catPick.map((q) => ({ kind: "cat", id: q.id })), ...habitPick.map((h) => ({ kind: "habit", id: h.id })), ...goalPick.map((g) => ({ kind: "goal", id: g.id }))];
}

// What a tiny version could look like, to offer before a full pause.
export function tinyVersion(kind, item) {
  if (kind === "cat") {
    return { writing: "10 minutes of writing", reading: "one page", movement: "a 10-minute walk", practices: "two minutes of breathing", sleep: "lights out by your target once", diet: "one good meal a day", screen: "one screen rule", substances: "your limit, no extras" }[item.id] || "the smallest version";
  }
  if (kind === "habit") return item.minutes ? `${Math.min(5, item.minutes)} minutes` : "once this week";
  return "one small task";
}

// Coming back: habits and categories restart next Monday; each goal is on track or late.
// A goal is late if any of its open tasks are due before the break ends (unless they're being moved).
export function comingBack(items, { today, goalsById = {}, tasks = [], moved = [] }) {
  const end = addDays(weekStart(today), 6);
  return items.map((x) => {
    if (x.kind !== "goal") return { ...x, status: "restarting" };
    const due = tasks.filter((t) => t.goal === x.id && !t.done && t.due && t.due <= end);
    const g = goalsById[x.id] || {};
    if (!due.length || moved.includes(x.id)) return { ...x, status: "on track", deadline: g.due || "", moving: due.length };
    return { ...x, status: "late", count: due.length };
  });
}

// Moving a goal's tasks due during the break to the same day next week.
export function moveDueTasks(w, goalIds, today) {
  const end = addDays(weekStart(today), 6);
  for (const t of w.tasks) if (goalIds.includes(t.goal) && !t.done && t.due && t.due <= end) t.due = addDays(t.due < today ? today : t.due, 7);
  return w;
}

export function newBreathing(draft, today, id) {
  return {
    id, week: weekStart(today), created: Date.now(),
    items: draft.items.filter((x) => !has(draft.tiny, x.kind, x.id)),
    tiny: draft.items.filter((x) => has(draft.tiny, x.kind, x.id)),
    why: draft.why || "", note: String(draft.note || "").slice(0, 300), moved: [...(draft.moved || [])],
  };
}

export const weekEnds = (today) => addDays(weekStart(today), 6);
