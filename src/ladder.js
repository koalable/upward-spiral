// Level-up habits: a weekly goal (e.g. exercise 2× a week, or 5 min a day 5 days a week)
// that earns a bonus each week it's hit, and a bigger bonus when you hit it enough weeks in a row
// to move up a level. Pure functions: question + days in, status out.
import { WEEK_GOAL_BONUS, LEVEL_UP_BONUS, DEFAULT_WEEKS_TO_LEVEL } from "./constants.js";
import { toNum, weekStart, weekOf, addDays, todayKey, clamp } from "./util.js";

export const isLadder = (q) => q?.kind === "ladder";

export function levelOf(q, index = q.level || 0) {
  const levels = q.levels?.length ? q.levels : [{ days: 2 }];
  const i = clamp(index, 0, levels.length - 1);
  return {
    index: i, number: i + 1, count: levels.length, isTop: i === levels.length - 1,
    days: Math.max(1, toNum(levels[i].days)), minutes: toNum(levels[i].minutes),
  };
}

export const levelLabel = (q, lvl = levelOf(q)) =>
  q.mode === "minutes" ? `${lvl.minutes} min a day, ${lvl.days} days a week` : `${lvl.days}× a week`;

// The version of the question a day was logged with (its level could differ from today's).
const versionOn = (q, day) => day?.cfg?.cats?.find((x) => x.id === q.id) || q;

export function doneOn(q, day) {
  if (!day?.logged) return false;
  const value = day.a?.c?.[q.id];
  const version = versionOn(q, day);
  if (version.mode === "minutes") return toNum(value) >= Math.max(1, levelOf(version).minutes);
  return value === true || toNum(value) > 0;
}

export function weekSummary(q, anyDayInWeek, days, quota = levelOf(q).days) {
  let count = 0, hitOn = null;
  const done = [];
  for (const d of weekOf(anyDayInWeek)) {
    const did = doneOn(q, days[d]);
    done.push(did);
    if (did && ++count === quota) hitOn = d;
  }
  return { count, quota, hitOn, done };
}

// Where this habit stands today, at its current level.
export function ladderStatus(q, days, today = todayKey()) {
  const level = levelOf(q);
  const need = toNum(q.weeksToLevel) || DEFAULT_WEEKS_TO_LEVEL;
  const thisWeek = weekSummary(q, today, days, level.days);
  const currentWeek = weekStart(today);
  let run = 0, completedOn = null;
  for (let w = weekStart(q.levelSince || today); w <= currentWeek && !completedOn; w = addDays(w, 7)) {
    const s = weekSummary(q, w, days, level.days);
    if (s.hitOn) { run++; if (run >= need) completedOn = s.hitOn; }
    else if (w < currentWeek) run = 0; // a finished week without the goal resets the run
  }
  return { level, need, run: Math.min(run, need), thisWeek, completedOn };
}

// Bonus points a given day earned from level-up habits. Level completions already
// passed are remembered in q.history so leveling up never takes a bonus away.
export function bonusOn(key, cats, days) {
  let bonus = 0, levelUp = false;
  for (const q of cats.filter(isLadder)) {
    const version = versionOn(q, days[key]);
    if (weekSummary(q, key, days, levelOf(version).days).hitOn === key) bonus += WEEK_GOAL_BONUS;
    const completedEarlier = (q.history || []).some((h) => h.on === key);
    if (completedEarlier || ladderStatus(q, days, key).completedOn === key) { bonus += LEVEL_UP_BONUS; levelUp = true; }
  }
  return { bonus, levelUp };
}
