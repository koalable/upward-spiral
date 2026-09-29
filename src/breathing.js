// Breathing room: pause any mix of check-in categories, habits and Work goals for the rest of this week,
// then make the time up over the next few weeks. Pure: data in, answers out.
// Kept in the settings doc:
//   breathing: [{ id, week (Monday key), items: [{ kind: "cat"|"habit"|"goal", id }], tiny: [same],
//                 why, note, makeUp (weeks, 2–4), created }]
// Paused = off the list this week, shown as "paused" rather than missed. Tiny = still on, but a small version counts.
import { addDays, weekStart, toNum } from "./util.js";

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

// Make-up weeks after a breathing room: which one (1-based) covers this date, or null.
export function makeUpFor(s, date) {
  const wk = weekStart(date);
  for (const b of s?.breathing || []) {
    const n = Math.round((new Date(`${wk}T12:00:00`) - new Date(`${b.week}T12:00:00`)) / 604800000);
    if (n >= 1 && n <= (b.makeUp || 0) && b.items?.length) return { b, week: n, of: b.makeUp };
  }
  return null;
}

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

// How the paused time gets made up, one line per item, spread over `weeks` weeks.
export function makeUpLines(items, weeks, { targets = {}, habitsById = {}, goalsById = {}, catName = (id) => id } = {}) {
  const w = Math.max(2, Math.min(4, Number(weeks) || 3));
  return items.map((x) => {
    if (x.kind === "goal") return `${goalsById[x.id]?.name || "Goal"}: deadlines stay; this week's tasks come back next week.`;
    if (x.kind === "habit") {
      const h = habitsById[x.id] || {};
      const perWeek = Array.isArray(h.days) ? h.days.length * Math.max(1, toNum(h.times) || 1) : Math.max(1, toNum(h.perWeek) || 1);
      return `${h.name || "Habit"}: +${Math.ceil(perWeek / w)} a week for ${w} weeks.`;
    }
    const perDay = { writing: toNum(targets.writeMin), reading: toNum(targets.readMin) }[x.id];
    if (perDay) return `${catName(x.id)}: +${Math.ceil(perDay / w)} min a day for ${w} weeks.`;
    return `${catName(x.id)}: a little extra each week for ${w} weeks.`;
  });
}

export function newBreathing(draft, today, id) {
  return {
    id, week: weekStart(today), created: Date.now(),
    items: draft.items.filter((x) => !has(draft.tiny, x.kind, x.id)),
    tiny: draft.items.filter((x) => has(draft.tiny, x.kind, x.id)),
    why: draft.why || "", note: String(draft.note || "").slice(0, 300), makeUp: Math.max(2, Math.min(4, Number(draft.makeUp) || 3)),
  };
}

export const weekEnds = (today) => addDays(weekStart(today), 6);
