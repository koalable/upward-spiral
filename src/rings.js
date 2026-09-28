// The day's rings: how full each energy group is for one date. Pure: data in, numbers out.
// Fill up, Protect and Spend well count check-in points. Show up counts finishing the check-in,
// the habits due that day, and that day's Work tasks (plus any scored questions filed under Show up).
import { GROUPS, groupOf } from "./energy.js";
import { scoredQuestions } from "./scoring.js";
import { POINTS_PER_CATEGORY } from "./constants.js";
import { isDone, EVERY_DAY } from "./routines.js";
import { parseKey } from "./util.js";

// Habits due on a date. Fixed-day habits count when scheduled; "× a week" ones only once done,
// so a flexible habit never drags the ring down (same rule as the streak calendars).
export function habitsDue(items, key, log) {
  let due = 0, done = 0;
  for (const r of items) {
    if (r.since && key < r.since) continue;
    const finished = isDone(r, key, log);
    if (r.perWeek ? !finished : !(r.days || EVERY_DAY).includes(parseKey(key).getDay())) continue;
    due++;
    if (finished) done++;
  }
  return { due, done };
}

// score: scoreDay() result. day: the stored day. habits: { due, done }. work: { total, done }.
export function dayRings({ cfg, score, day, habits = { due: 0, done: 0 }, work = { total: 0, done: 0 } }) {
  const questions = scoredQuestions(day?.cfg || cfg);
  const rings = GROUPS.map((g) => {
    const mine = questions.filter((q) => groupOf(q).id === g.id);
    let earned = mine.reduce((s, q) => s + (score.points[q.id] || 0), 0);
    let possible = mine.length * POINTS_PER_CATEGORY;
    let label = { done: earned, of: possible };
    if (g.id === "show") {
      // Everything here counts as one "thing"; a Show up question counts fully once it earns full points.
      const qDone = mine.filter((q) => (score.points[q.id] || 0) >= POINTS_PER_CATEGORY).length;
      const finished = day?.a?.doneAt ? 1 : 0;
      label = { done: finished + habits.done + work.done + qDone, of: 1 + habits.due + work.total + mine.length };
      earned = finished + habits.done + work.done + earned / POINTS_PER_CATEGORY;
      possible = 1 + habits.due + work.total + mine.length;
    }
    const pct = possible ? Math.min(1, earned / possible) : 0;
    return { ...g, earned, possible, pct, label };
  }).filter((r) => r.possible > 0);
  const overall = rings.length ? rings.reduce((s, r) => s + r.pct, 0) / rings.length : 0;
  return { rings, overall, allFull: rings.length > 0 && rings.every((r) => r.pct >= 1) };
}
